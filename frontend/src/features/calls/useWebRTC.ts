import { useCallback, useRef } from 'react';

const ICE_SERVERS: RTCConfiguration = {
	iceServers: [
		{ urls: 'stun:stun.l.google.com:19302' },
		{ urls: 'stun:stun1.l.google.com:19302' },
	],
};

export type IceHandler = (candidate: RTCIceCandidateInit) => void;
export type TrackHandler = (stream: MediaStream) => void;

export function useWebRTC() {
	const pcRef = useRef<RTCPeerConnection | null>(null);
	const localStreamRef = useRef<MediaStream | null>(null);
	const remoteStreamRef = useRef<MediaStream | null>(null);

	const ensurePc = useCallback(
		(onIce: IceHandler, onTrack: TrackHandler) => {
			if (pcRef.current) return pcRef.current;
			const pc = new RTCPeerConnection(ICE_SERVERS);
			pc.onicecandidate = (e) => {
				if (e.candidate) {
					onIce(e.candidate.toJSON());
				}
			};
			pc.ontrack = (e) => {
				const stream =
					e.streams[0] ||
					remoteStreamRef.current ||
					new MediaStream();
				if (!e.streams[0] && e.track) {
					stream.addTrack(e.track);
				}
				remoteStreamRef.current = stream;
				onTrack(stream);
			};
			pcRef.current = pc;
			return pc;
		},
		[]
	);

	const getMedia = useCallback(async (video: boolean) => {
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: true,
			video: video
				? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
				: false,
		});
		localStreamRef.current = stream;
		return stream;
	}, []);

	const attachLocalTracks = useCallback((pc: RTCPeerConnection, stream: MediaStream) => {
		stream.getTracks().forEach((track) => {
			pc.addTrack(track, stream);
		});
	}, []);

	const createOffer = useCallback(
		async (video: boolean, onIce: IceHandler, onTrack: TrackHandler) => {
			const stream = await getMedia(video);
			const pc = ensurePc(onIce, onTrack);
			attachLocalTracks(pc, stream);
			const offer = await pc.createOffer();
			await pc.setLocalDescription(offer);
			return { sdp: offer, stream };
		},
		[attachLocalTracks, ensurePc, getMedia]
	);

	const acceptOffer = useCallback(
		async (
			remoteSdp: RTCSessionDescriptionInit,
			video: boolean,
			onIce: IceHandler,
			onTrack: TrackHandler
		) => {
			const stream = await getMedia(video);
			const pc = ensurePc(onIce, onTrack);
			attachLocalTracks(pc, stream);
			await pc.setRemoteDescription(remoteSdp);
			const answer = await pc.createAnswer();
			await pc.setLocalDescription(answer);
			return { sdp: answer, stream };
		},
		[attachLocalTracks, ensurePc, getMedia]
	);

	const handleAnswer = useCallback(async (remoteSdp: RTCSessionDescriptionInit) => {
		const pc = pcRef.current;
		if (!pc) return;
		await pc.setRemoteDescription(remoteSdp);
	}, []);

	const addIce = useCallback(async (candidate: RTCIceCandidateInit) => {
		const pc = pcRef.current;
		if (!pc || !candidate) return;
		try {
			await pc.addIceCandidate(candidate);
		} catch (e) {
			console.warn('[WebRTC] addIce failed', e);
		}
	}, []);

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
		localStreamRef.current?.getTracks().forEach((t) => t.stop());
		localStreamRef.current = null;
		remoteStreamRef.current = null;
		if (pcRef.current) {
			pcRef.current.onicecandidate = null;
			pcRef.current.ontrack = null;
			pcRef.current.close();
			pcRef.current = null;
		}
	}, []);

	return {
		createOffer,
		acceptOffer,
		handleAnswer,
		addIce,
		setAudioEnabled,
		setVideoEnabled,
		hangup,
		get localStream() {
			return localStreamRef.current;
		},
		get remoteStream() {
			return remoteStreamRef.current;
		},
	};
}
