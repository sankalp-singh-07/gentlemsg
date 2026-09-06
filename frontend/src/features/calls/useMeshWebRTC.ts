import { useCallback, useRef, useState } from 'react';

const ICE_SERVERS: RTCConfiguration = {
	iceServers: [
		{ urls: 'stun:stun.l.google.com:19302' },
		{ urls: 'stun:stun1.l.google.com:19302' },
	],
};

export type MeshIceHandler = (
	peerId: string,
	candidate: RTCIceCandidateInit
) => void;

/**
 * One RTCPeerConnection per remote participant (mesh).
 * Deterministic offers: the lexicographically smaller user id creates the offer.
 */
export function useMeshWebRTC() {
	const pcs = useRef(new Map<string, RTCPeerConnection>());
	const localStreamRef = useRef<MediaStream | null>(null);
	const remotesRef = useRef(new Map<string, MediaStream>());
	const pendingIce = useRef(new Map<string, RTCIceCandidateInit[]>());
	const iceHandlerRef = useRef<MeshIceHandler | null>(null);
	const [remoteStreams, setRemoteStreams] = useState<
		Record<string, MediaStream>
	>({});

	const publishRemotes = useCallback(() => {
		setRemoteStreams(Object.fromEntries(remotesRef.current));
	}, []);

	const setIceHandler = useCallback((fn: MeshIceHandler | null) => {
		iceHandlerRef.current = fn;
	}, []);

	const getMedia = useCallback(async (video: boolean) => {
		if (localStreamRef.current) {
			const hasVideo = localStreamRef.current.getVideoTracks().length > 0;
			if (hasVideo === video || !video) return localStreamRef.current;
			localStreamRef.current.getTracks().forEach((t) => t.stop());
			localStreamRef.current = null;
		}
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: true,
			video: video
				? {
						facingMode: 'user',
						width: { ideal: 1280 },
						height: { ideal: 720 },
					}
				: false,
		});
		localStreamRef.current = stream;
		return stream;
	}, []);

	const ensurePc = useCallback(
		(peerId: string) => {
			const existing = pcs.current.get(peerId);
			if (existing) return existing;

			const pc = new RTCPeerConnection(ICE_SERVERS);
			pc.onicecandidate = (e) => {
				if (e.candidate) {
					iceHandlerRef.current?.(peerId, e.candidate.toJSON());
				}
			};
			pc.ontrack = (e) => {
				let stream = e.streams[0] || remotesRef.current.get(peerId);
				if (!stream) stream = new MediaStream();
				if (!e.streams[0] && e.track && !stream.getTracks().includes(e.track)) {
					stream.addTrack(e.track);
				}
				remotesRef.current.set(peerId, stream);
				publishRemotes();
			};
			const local = localStreamRef.current;
			if (local) {
				local.getTracks().forEach((track) => pc.addTrack(track, local));
			}
			pcs.current.set(peerId, pc);

			const queued = pendingIce.current.get(peerId) || [];
			pendingIce.current.delete(peerId);
			queued.forEach((c) => {
				pc.addIceCandidate(c).catch(() => undefined);
			});
			return pc;
		},
		[publishRemotes]
	);

	const createOfferTo = useCallback(
		async (peerId: string) => {
			const pc = ensurePc(peerId);
			const offer = await pc.createOffer();
			await pc.setLocalDescription(offer);
			return offer;
		},
		[ensurePc]
	);

	const acceptOfferFrom = useCallback(
		async (peerId: string, remoteSdp: RTCSessionDescriptionInit) => {
			const pc = ensurePc(peerId);
			await pc.setRemoteDescription(remoteSdp);
			const answer = await pc.createAnswer();
			await pc.setLocalDescription(answer);
			return answer;
		},
		[ensurePc]
	);

	const handleAnswerFrom = useCallback(
		async (peerId: string, remoteSdp: RTCSessionDescriptionInit) => {
			const pc = pcs.current.get(peerId);
			if (!pc) return;
			if (pc.signalingState === 'stable') return;
			await pc.setRemoteDescription(remoteSdp);
		},
		[]
	);

	const addIceFrom = useCallback(
		async (peerId: string, candidate: RTCIceCandidateInit) => {
			if (!candidate) return;
			const pc = pcs.current.get(peerId);
			if (!pc) {
				const q = pendingIce.current.get(peerId) || [];
				q.push(candidate);
				pendingIce.current.set(peerId, q);
				return;
			}
			try {
				await pc.addIceCandidate(candidate);
			} catch (e) {
				console.warn('[MeshWebRTC] addIce failed', e);
			}
		},
		[]
	);

	const removePeer = useCallback(
		(peerId: string) => {
			const pc = pcs.current.get(peerId);
			if (pc) {
				pc.onicecandidate = null;
				pc.ontrack = null;
				pc.close();
				pcs.current.delete(peerId);
			}
			remotesRef.current.delete(peerId);
			pendingIce.current.delete(peerId);
			publishRemotes();
		},
		[publishRemotes]
	);

	const setAudioEnabled = useCallback((enabled: boolean) => {
		localStreamRef.current?.getAudioTracks().forEach((t) => {
			t.enabled = enabled;
		});
	}, []);

	const setVideoEnabled = useCallback((enabled: boolean) => {
		localStreamRef.current?.getVideoTracks().forEach((t) => {
			t.enabled = enabled;
		});
	}, []);

	const hangup = useCallback(() => {
		pcs.current.forEach((pc) => {
			pc.onicecandidate = null;
			pc.ontrack = null;
			pc.close();
		});
		pcs.current.clear();
		remotesRef.current.clear();
		pendingIce.current.clear();
		localStreamRef.current?.getTracks().forEach((t) => t.stop());
		localStreamRef.current = null;
		setRemoteStreams({});
	}, []);

	return {
		getMedia,
		createOfferTo,
		acceptOfferFrom,
		handleAnswerFrom,
		addIceFrom,
		removePeer,
		setIceHandler,
		setAudioEnabled,
		setVideoEnabled,
		hangup,
		remoteStreams,
		get localStream() {
			return localStreamRef.current;
		},
	};
}
