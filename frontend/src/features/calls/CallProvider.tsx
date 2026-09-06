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
import { useMeshWebRTC } from './useMeshWebRTC';
import { CallOverlay } from './CallOverlay';
import { toast } from 'react-toastify';

export type CallStatus =
	| 'idle'
	| 'ringing_out'
	| 'ringing_in'
	| 'connecting'
	| 'active';

export interface CallParticipant {
	id: string;
	name: string;
	photoURL: string;
	joined: boolean;
}

export interface CallState {
	status: CallStatus;
	callId: string | null;
	callType: 'audio' | 'video';
	peerId: string | null;
	peerName: string;
	peerPhotoURL: string;
	isCaller: boolean;
	isGroup: boolean;
	groupId: string | null;
	groupName: string;
	groupAvatarURL: string;
	participants: CallParticipant[];
}

interface CallContextValue {
	state: CallState;
	startCall: (
		peer: { id: string; name?: string; photoURL?: string },
		type: 'audio' | 'video'
	) => void;
	startGroupCall: (
		group: {
			id: string;
			name?: string;
			avatarURL?: string;
			members: Array<{ userId: string; name?: string; photoURL?: string }>;
		},
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
	isGroup: false,
	groupId: null,
	groupName: '',
	groupAvatarURL: '',
	participants: [],
};

function uuid() {
	return (
		crypto.randomUUID?.() ||
		`call-${Date.now()}-${Math.random().toString(36).slice(2)}`
	);
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
	const joinedRef = useRef<Set<string>>(new Set());
	const webrtc = useWebRTC();
	const mesh = useMeshWebRTC();

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
		mesh.hangup();
		setLocalStream(null);
		setRemoteStream(null);
		setMuted(false);
		setCameraOff(false);
		pendingOffer.current = null;
		startedAt.current = null;
		joinedRef.current = new Set();
		setState(IDLE);
	}, [webrtc, mesh]);

	const endCall = useCallback(() => {
		const s = stateRef.current;
		if (s.status === 'idle' || !s.callId) {
			cleanup();
			return;
		}
		const duration =
			startedAt.current != null
				? Math.floor((Date.now() - startedAt.current) / 1000)
				: 0;
		if (s.isGroup && s.groupId) {
			if (s.isCaller) {
				signal({
					event: 'group_call_end',
					callId: s.callId,
					groupId: s.groupId,
					durationSeconds: duration,
				});
			} else {
				signal({
					event: 'group_call_leave',
					callId: s.callId,
					groupId: s.groupId,
					durationSeconds: duration,
				});
			}
		} else if (s.peerId) {
			signal({
				event: 'call_end',
				callId: s.callId,
				toUserId: s.peerId,
				durationSeconds: duration,
			});
		}
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

	const meshOfferTo = useCallback(
		async (peerId: string) => {
			const s = stateRef.current;
			if (!s.callId || !currentUser?.id) return;
			try {
				const sdp = await mesh.createOfferTo(peerId);
				signal({
					event: 'webrtc_offer',
					callId: s.callId,
					toUserId: peerId,
					groupId: s.groupId,
					sdp,
				});
			} catch (e) {
				console.error('[GroupCall] offer failed', e);
			}
		},
		[currentUser?.id, mesh, signal]
	);

	useEffect(() => {
		mesh.setIceHandler((peerId, candidate) => {
			const s = stateRef.current;
			if (!s.callId) return;
			signal({
				event: 'webrtc_ice',
				callId: s.callId,
				toUserId: peerId,
				groupId: s.groupId,
				candidate,
			});
		});
		return () => mesh.setIceHandler(null);
	}, [mesh, signal]);

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
				...IDLE,
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

	const startGroupCall = useCallback(
		async (
			group: {
				id: string;
				name?: string;
				avatarURL?: string;
				members: Array<{
					userId: string;
					name?: string;
					photoURL?: string;
				}>;
			},
			type: 'audio' | 'video'
		) => {
			if (!currentUser?.id) return;
			if (stateRef.current.status !== 'idle') {
				toast.info('Already in a call');
				return;
			}
			const others = (group.members || []).filter(
				(m) => m.userId && m.userId !== currentUser.id
			);
			if (!others.length) {
				toast.info('No one else in this group');
				return;
			}
			const callId = uuid();
			joinedRef.current = new Set([currentUser.id]);
			setState({
				...IDLE,
				status: 'ringing_out',
				callId,
				callType: type,
				isCaller: true,
				isGroup: true,
				groupId: group.id,
				groupName: group.name || 'Group',
				groupAvatarURL: group.avatarURL || '',
				peerName: group.name || 'Group',
				peerPhotoURL: group.avatarURL || '',
				participants: others.map((m) => ({
					id: m.userId,
					name: m.name || 'Member',
					photoURL: m.photoURL || '',
					joined: false,
				})),
			});

			try {
				const stream = await mesh.getMedia(type === 'video');
				setLocalStream(stream);
			} catch (e) {
				console.error(e);
				toast.error('Could not access microphone/camera');
				cleanup();
				return;
			}

			const sent = signal({
				event: 'group_call_invite',
				callId,
				groupId: group.id,
				callType: type,
				fromName: currentUser.name,
				fromPhotoURL: currentUser.photoURL,
			});
			if (!sent) {
				toast.error('Not connected — try again');
				cleanup();
			}
		},
		[cleanup, currentUser, mesh, signal]
	);

	const acceptIncoming = useCallback(async () => {
		const s = stateRef.current;
		if (!s.callId || !currentUser?.id) return;

		if (s.isGroup && s.groupId) {
			setState((prev) => ({ ...prev, status: 'connecting' }));
			try {
				const stream = await mesh.getMedia(s.callType === 'video');
				setLocalStream(stream);
				joinedRef.current.add(currentUser.id);
				signal({
					event: 'group_call_join',
					callId: s.callId,
					groupId: s.groupId,
					callType: s.callType,
					fromName: currentUser.name,
					fromPhotoURL: currentUser.photoURL,
				});
				startedAt.current = Date.now();
				setState((prev) => ({ ...prev, status: 'active' }));
				// Offer to anyone already joined with a smaller id? They will offer to us
				// if their id is smaller. If ours is smaller, offer to already-joined peers.
				for (const pid of joinedRef.current) {
					if (pid === currentUser.id) continue;
					if (currentUser.id < pid) {
						void meshOfferTo(pid);
					}
				}
			} catch (e) {
				console.error(e);
				toast.error('Could not access microphone/camera');
				endCall();
			}
			return;
		}

		if (!s.peerId) return;
		setState((prev) => ({ ...prev, status: 'connecting' }));
		signal({
			event: 'call_accept',
			callId: s.callId,
			toUserId: s.peerId,
		});

		try {
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
	}, [
		currentUser,
		endCall,
		mesh,
		meshOfferTo,
		onIce,
		onTrack,
		signal,
		webrtc,
	]);

	const rejectIncoming = useCallback(() => {
		const s = stateRef.current;
		if (s.isGroup && s.groupId && s.callId) {
			signal({
				event: 'group_call_reject',
				callId: s.callId,
				groupId: s.groupId,
			});
		} else if (s.peerId && s.callId) {
			signal({
				event: 'call_reject',
				callId: s.callId,
				toUserId: s.peerId,
			});
		}
		cleanup();
	}, [cleanup, signal]);

	useEffect(() => {
		const unsub = presenceHub.subscribe(async (event) => {
			const type = event.event as string;
			const s = stateRef.current;
			const myId = currentUser?.id;

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
						...IDLE,
						status: 'ringing_in',
						callId: event.callId as string,
						callType:
							(event.callType as 'audio' | 'video') || 'audio',
						peerId: event.fromUserId as string,
						peerName: (event.fromName as string) || 'User',
						peerPhotoURL: (event.fromPhotoURL as string) || '',
						isCaller: false,
					});
					break;
				}
				case 'group_call_invite': {
					if (s.status !== 'idle') {
						signal({
							event: 'group_call_reject',
							callId: event.callId,
							groupId: event.groupId,
						});
						return;
					}
					const memberIds = (event.memberIds as string[]) || [];
					setState({
						...IDLE,
						status: 'ringing_in',
						callId: event.callId as string,
						callType:
							(event.callType as 'audio' | 'video') || 'audio',
						isCaller: false,
						isGroup: true,
						groupId: event.groupId as string,
						groupName: (event.groupName as string) || 'Group',
						groupAvatarURL:
							(event.groupAvatarURL as string) || '',
						peerId: event.fromUserId as string,
						peerName: (event.fromName as string) || 'User',
						peerPhotoURL: (event.fromPhotoURL as string) || '',
						participants: memberIds
							.filter((id) => id !== myId)
							.map((id) => ({
								id,
								name:
									id === event.fromUserId
										? (event.fromName as string) || 'Member'
										: 'Member',
								photoURL:
									id === event.fromUserId
										? (event.fromPhotoURL as string) || ''
										: '',
								joined: id === event.fromUserId,
							})),
					});
					if (event.fromUserId) {
						joinedRef.current = new Set([
							event.fromUserId as string,
						]);
					}
					break;
				}
				case 'group_call_join': {
					if (!s.isGroup || s.callId !== event.callId) return;
					const fromId = event.fromUserId as string;
					if (!fromId || fromId === myId) return;
					joinedRef.current.add(fromId);
					setState((prev) => ({
						...prev,
						status:
							prev.status === 'ringing_out'
								? 'active'
								: prev.status,
						participants: prev.participants.some((p) => p.id === fromId)
							? prev.participants.map((p) =>
									p.id === fromId
										? {
												...p,
												joined: true,
												name:
													(event.fromName as string) ||
													p.name,
												photoURL:
													(event.fromPhotoURL as string) ||
													p.photoURL,
											}
										: p
								)
							: [
									...prev.participants,
									{
										id: fromId,
										name:
											(event.fromName as string) ||
											'Member',
										photoURL:
											(event.fromPhotoURL as string) ||
											'',
										joined: true,
									},
								],
					}));
					if (!startedAt.current) startedAt.current = Date.now();
					if (
						myId &&
						joinedRef.current.has(myId) &&
						myId < fromId
					) {
						void meshOfferTo(fromId);
					}
					break;
				}
				case 'group_call_leave': {
					if (!s.isGroup || s.callId !== event.callId) return;
					const fromId = event.fromUserId as string;
					joinedRef.current.delete(fromId);
					mesh.removePeer(fromId);
					setState((prev) => ({
						...prev,
						participants: prev.participants.map((p) =>
							p.id === fromId ? { ...p, joined: false } : p
						),
					}));
					break;
				}
				case 'group_call_end': {
					if (event.callId && s.callId && event.callId !== s.callId)
						return;
					if (s.isGroup) {
						toast.info('Group call ended', {
							toastId: `gcall_end-${event.callId}`,
						});
						cleanup();
					}
					break;
				}
				case 'group_call_reject': {
					if (!s.isGroup || s.callId !== event.callId) return;
					break;
				}
				case 'call_accept': {
					if (!s.isCaller || s.callId !== event.callId || s.isGroup)
						return;
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
					if (event.callId && s.callId && event.callId !== s.callId)
						return;
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
						if (s.isGroup) {
							toast.info('No one is online to take the call', {
								toastId: `call_unavail-${callKey}`,
							});
						} else {
							toast.info('User may be offline', {
								toastId: `call_unavail-${callKey}`,
							});
						}
					}
					cleanup();
					break;
				}
				case 'webrtc_offer': {
					if (s.callId && event.callId !== s.callId) return;
					if (s.isGroup) {
						const fromId = event.fromUserId as string;
						if (!fromId || !event.sdp) return;
						try {
							const answer = await mesh.acceptOfferFrom(
								fromId,
								event.sdp as RTCSessionDescriptionInit
							);
							signal({
								event: 'webrtc_answer',
								callId: s.callId,
								toUserId: fromId,
								groupId: s.groupId,
								sdp: answer,
							});
						} catch (e) {
							console.error('[GroupCall] accept offer failed', e);
						}
						return;
					}
					pendingOffer.current =
						event.sdp as RTCSessionDescriptionInit;
					break;
				}
				case 'webrtc_answer': {
					if (s.callId !== event.callId) return;
					if (s.isGroup) {
						const fromId = event.fromUserId as string;
						try {
							await mesh.handleAnswerFrom(
								fromId,
								event.sdp as RTCSessionDescriptionInit
							);
						} catch (e) {
							console.error(e);
						}
						return;
					}
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
					if (s.isGroup) {
						await mesh.addIceFrom(
							event.fromUserId as string,
							event.candidate as RTCIceCandidateInit
						);
						return;
					}
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
	}, [
		cleanup,
		currentUser?.id,
		endCall,
		mesh,
		meshOfferTo,
		onIce,
		onTrack,
		signal,
		webrtc,
	]);

	useEffect(() => {
		if (state.status !== 'ringing_out') return;
		const t = setTimeout(() => {
			if (state.isGroup) {
				const anyone = state.participants.some((p) => p.joined);
				if (anyone) return;
				toast.info('No one answered');
			} else {
				toast.info('No answer');
			}
			endCall();
		}, 45000);
		return () => clearTimeout(t);
	}, [state.status, state.isGroup, state.participants, endCall]);

	const value = useMemo(
		() => ({
			state,
			startCall,
			startGroupCall,
			endCall,
		}),
		[state, startCall, startGroupCall, endCall]
	);

	return (
		<CallContext.Provider value={value}>
			{children}
			<CallOverlay
				state={state}
				localStream={localStream}
				remoteStream={remoteStream}
				remoteStreams={mesh.remoteStreams}
				muted={muted}
				cameraOff={cameraOff}
				onAccept={() => void acceptIncoming()}
				onReject={rejectIncoming}
				onEnd={endCall}
				onToggleMute={() => {
					const next = !muted;
					setMuted(next);
					webrtc.setAudioEnabled(!next);
					mesh.setAudioEnabled(!next);
				}}
				onToggleCamera={() => {
					const next = !cameraOff;
					setCameraOff(next);
					webrtc.setVideoEnabled(!next);
					mesh.setVideoEnabled(!next);
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
