import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/store/user/user.selector';
import { presenceHub } from '@/shared/ws/presenceHub';
import { useWebRTC } from './useWebRTC';
import { CallOverlay } from './CallOverlay';
import { toast } from 'react-toastify';

export type CallStatus =
	| 'idle'
	| 'ringing_out'
	| 'ringing_in'
	| 'connecting'
	| 'active';

export interface CallState {
	status: CallStatus;
	callId: string | null;
	callType: 'audio' | 'video';
	peerId: string | null;
	peerName: string;
	peerPhotoURL: string;
	isCaller: boolean;
}

interface CallContextValue {
	state: CallState;
	startCall: (
		peer: { id: string; name?: string; photoURL?: string },
		type: 'audio' | 'video'
	) => void;
	endCall: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

const IDLE: CallState = {
	status: 'idle',
	callId: null,
	callType: 'audio',
	peerId: null,
	peerName: '',
	peerPhotoURL: '',
	isCaller: false,
};

function uuid() {
	return crypto.randomUUID?.() || `call-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function CallProvider({ children }: { children: ReactNode }) {
	const { currentUser } = useSelector(selectCurrentUser);
	const [state, setState] = useState<CallState>(IDLE);
	const [muted, setMuted] = useState(false);
	const [cameraOff, setCameraOff] = useState(false);
	const [localStream, setLocalStream] = useState<MediaStream | null>(null);
	const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
	const stateRef = useRef(state);
	const pendingOffer = useRef<RTCSessionDescriptionInit | null>(null);
	const startedAt = useRef<number | null>(null);
	const webrtc = useWebRTC();

	useEffect(() => {
		stateRef.current = state;
	}, [state]);

	const signal = useCallback(
		(payload: Record<string, unknown>) => {
			const ok = presenceHub.send(payload);
			if (!ok) {
				console.warn('[Call] presence not connected');
			}
			return ok;
		},
		[]
	);

	const cleanup = useCallback(() => {
		webrtc.hangup();
		setLocalStream(null);
		setRemoteStream(null);
		setMuted(false);
		setCameraOff(false);
		pendingOffer.current = null;
		startedAt.current = null;
		setState(IDLE);
	}, [webrtc]);

	const endCall = useCallback(() => {
		const s = stateRef.current;
		if (s.status === 'idle' || !s.peerId || !s.callId) {
			cleanup();
			return;
		}
		const duration =
			startedAt.current != null
				? Math.floor((Date.now() - startedAt.current) / 1000)
				: 0;
		signal({
			event: 'call_end',
			callId: s.callId,
			toUserId: s.peerId,
			durationSeconds: duration,
		});
		cleanup();
	}, [cleanup, signal]);

	const onIce = useCallback(
		(candidate: RTCIceCandidateInit) => {
			const s = stateRef.current;
			if (!s.peerId || !s.callId) return;
			signal({
				event: 'webrtc_ice',
				callId: s.callId,
				toUserId: s.peerId,
				candidate,
			});
		},
		[signal]
	);

	const onTrack = useCallback((stream: MediaStream) => {
		setRemoteStream(stream);
	}, []);

	const startCall = useCallback(
		async (
			peer: { id: string; name?: string; photoURL?: string },
			type: 'audio' | 'video'
		) => {
			if (!currentUser?.id) return;
			if (stateRef.current.status !== 'idle') {
				toast.info('Already in a call');
				return;
			}
			const callId = uuid();
			setState({
				status: 'ringing_out',
				callId,
				callType: type,
				peerId: peer.id,
				peerName: peer.name || 'User',
				peerPhotoURL: peer.photoURL || '',
				isCaller: true,
			});

			const sent = signal({
				event: 'call_invite',
				callId,
				toUserId: peer.id,
				callType: type,
				fromName: currentUser.name,
				fromPhotoURL: currentUser.photoURL,
			});
			if (!sent) {
				toast.error('Not connected — try again');
				cleanup();
			}
		},
		[cleanup, currentUser, signal]
	);

	const acceptIncoming = useCallback(async () => {
		const s = stateRef.current;
		if (!s.callId || !s.peerId || !currentUser?.id) return;

		setState((prev) => ({ ...prev, status: 'connecting' }));
		signal({
			event: 'call_accept',
			callId: s.callId,
			toUserId: s.peerId,
		});

		try {
			// Wait for offer if not yet received
			let tries = 0;
			while (!pendingOffer.current && tries < 50) {
				await new Promise((r) => setTimeout(r, 100));
				tries += 1;
			}
			if (!pendingOffer.current) {
				toast.error('No offer received');
				endCall();
				return;
			}
			const { sdp, stream } = await webrtc.acceptOffer(
				pendingOffer.current,
				s.callType === 'video',
				onIce,
				onTrack
			);
			setLocalStream(stream);
			signal({
				event: 'webrtc_answer',
				callId: s.callId,
				toUserId: s.peerId,
				sdp,
			});
			startedAt.current = Date.now();
			setState((prev) => ({ ...prev, status: 'active' }));
		} catch (e) {
			console.error(e);
			toast.error('Could not access microphone/camera');
			endCall();
		}
	}, [currentUser?.id, endCall, onIce, onTrack, signal, webrtc]);

	const rejectIncoming = useCallback(() => {
		const s = stateRef.current;
		if (s.peerId && s.callId) {
			signal({
				event: 'call_reject',
				callId: s.callId,
				toUserId: s.peerId,
			});
		}
		cleanup();
	}, [cleanup, signal]);

	// Handle signaling events
	useEffect(() => {
		const unsub = presenceHub.subscribe(async (event) => {
			const type = event.event as string;
			const s = stateRef.current;

			switch (type) {
				case 'call_invite': {
					if (s.status !== 'idle') {
						signal({
							event: 'call_busy',
							callId: event.callId,
							toUserId: event.fromUserId,
						});
						return;
					}
					setState({
						status: 'ringing_in',
						callId: event.callId as string,
						callType: (event.callType as 'audio' | 'video') || 'audio',
						peerId: event.fromUserId as string,
						peerName: (event.fromName as string) || 'User',
						peerPhotoURL: (event.fromPhotoURL as string) || '',
						isCaller: false,
					});
					break;
				}
				case 'call_accept': {
					if (!s.isCaller || s.callId !== event.callId) return;
					setState((prev) => ({ ...prev, status: 'connecting' }));
					try {
						const { sdp, stream } = await webrtc.createOffer(
							s.callType === 'video',
							onIce,
							onTrack
						);
						setLocalStream(stream);
						signal({
							event: 'webrtc_offer',
							callId: s.callId,
							toUserId: s.peerId,
							sdp,
						});
						startedAt.current = Date.now();
						setState((prev) => ({ ...prev, status: 'active' }));
					} catch (e) {
						console.error(e);
						toast.error('Could not access microphone/camera');
						endCall();
					}
					break;
				}
				case 'call_reject':
				case 'call_busy':
				case 'call_end':
				case 'call_peer_unavailable': {
					if (event.callId && s.callId && event.callId !== s.callId) return;
					const callKey = String(event.callId || s.callId || '');
					if (type === 'call_reject') {
						toast.info('Call declined', {
							toastId: `call_reject-${callKey}`,
						});
					}
					if (type === 'call_busy') {
						toast.info('User is busy', {
							toastId: `call_busy-${callKey}`,
						});
					}
					if (type === 'call_peer_unavailable') {
						toast.info('User may be offline', {
							toastId: `call_unavail-${callKey}`,
						});
					}
					cleanup();
					break;
				}
				case 'webrtc_offer': {
					if (s.callId && event.callId !== s.callId) return;
					pendingOffer.current = event.sdp as RTCSessionDescriptionInit;
					// If already accepted and waiting, acceptOffer path handles it
					break;
				}
				case 'webrtc_answer': {
					if (s.callId !== event.callId) return;
					try {
						await webrtc.handleAnswer(
							event.sdp as RTCSessionDescriptionInit
						);
					} catch (e) {
						console.error(e);
					}
					break;
				}
				case 'webrtc_ice': {
					if (s.callId !== event.callId) return;
					await webrtc.addIce(
						event.candidate as RTCIceCandidateInit
					);
					break;
				}
				default:
					break;
			}
		});
		return unsub;
	}, [cleanup, endCall, onIce, onTrack, signal, webrtc]);

	// Auto-timeout outgoing ring after 45s
	useEffect(() => {
		if (state.status !== 'ringing_out') return;
		const t = setTimeout(() => {
			toast.info('No answer');
			endCall();
		}, 45000);
		return () => clearTimeout(t);
	}, [state.status, endCall]);

	const value = useMemo(
		() => ({
			state,
			startCall,
			endCall,
		}),
		[state, startCall, endCall]
	);

	return (
		<CallContext.Provider value={value}>
			{children}
			<CallOverlay
				state={state}
				localStream={localStream}
				remoteStream={remoteStream}
				muted={muted}
				cameraOff={cameraOff}
				onAccept={() => void acceptIncoming()}
				onReject={rejectIncoming}
				onEnd={endCall}
				onToggleMute={() => {
					const next = !muted;
					setMuted(next);
					webrtc.setAudioEnabled(!next);
				}}
				onToggleCamera={() => {
					const next = !cameraOff;
					setCameraOff(next);
					webrtc.setVideoEnabled(!next);
				}}
			/>
		</CallContext.Provider>
	);
}

export function useCall() {
	const ctx = useContext(CallContext);
	if (!ctx) throw new Error('useCall must be used within CallProvider');
	return ctx;
}
