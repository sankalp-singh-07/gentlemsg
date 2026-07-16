import { useEffect, useRef } from 'react';
import {
	Mic,
	MicOff,
	Phone,
	PhoneOff,
	Video,
	VideoOff,
} from 'lucide-react';
import type { CallState } from './CallProvider';

interface Props {
	state: CallState;
	localStream: MediaStream | null;
	remoteStream: MediaStream | null;
	muted: boolean;
	cameraOff: boolean;
	onAccept: () => void;
	onReject: () => void;
	onEnd: () => void;
	onToggleMute: () => void;
	onToggleCamera: () => void;
}

export function CallOverlay({
	state,
	localStream,
	remoteStream,
	muted,
	cameraOff,
	onAccept,
	onReject,
	onEnd,
	onToggleMute,
	onToggleCamera,
}: Props) {
	const remoteVideoRef = useRef<HTMLVideoElement>(null);
	const localVideoRef = useRef<HTMLVideoElement>(null);
	const remoteAudioRef = useRef<HTMLAudioElement>(null);

	useEffect(() => {
		if (remoteVideoRef.current && remoteStream) {
			remoteVideoRef.current.srcObject = remoteStream;
		}
		if (remoteAudioRef.current && remoteStream) {
			remoteAudioRef.current.srcObject = remoteStream;
		}
	}, [remoteStream]);

	useEffect(() => {
		if (localVideoRef.current && localStream) {
			localVideoRef.current.srcObject = localStream;
		}
	}, [localStream]);

	if (state.status === 'idle') return null;

	const isVideo = state.callType === 'video';
	const peerName = state.peerName || 'User';
	const active =
		state.status === 'active' || state.status === 'connecting';

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
			<div className="relative w-full max-w-lg bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl text-white">
				<div className="relative aspect-video bg-zinc-950 flex items-center justify-center min-h-[220px]">
					{isVideo && active ? (
						<>
							<video
								ref={remoteVideoRef}
								autoPlay
								playsInline
								className="w-full h-full object-cover"
							/>
							<video
								ref={localVideoRef}
								autoPlay
								playsInline
								muted
								className="absolute bottom-3 right-3 w-28 h-20 object-cover rounded-lg border border-white/20 shadow-lg bg-black"
							/>
						</>
					) : (
						<div className="flex flex-col items-center gap-3 py-12">
							{state.peerPhotoURL ? (
								<img
									src={state.peerPhotoURL}
									alt=""
									className="w-24 h-24 rounded-full object-cover"
									referrerPolicy="no-referrer"
								/>
							) : (
								<div className="w-24 h-24 rounded-full bg-sky-600/60 flex items-center justify-center text-3xl font-bold">
									{peerName.charAt(0).toUpperCase()}
								</div>
							)}
							<audio ref={remoteAudioRef} autoPlay />
						</div>
					)}
					{/* Always attach remote audio for video calls too (some browsers need it) */}
					{isVideo && <audio ref={remoteAudioRef} autoPlay className="hidden" />}
				</div>

				<div className="p-5 text-center space-y-1">
					<p className="text-lg font-semibold">{peerName}</p>
					<p className="text-sm text-white/60">
						{state.status === 'ringing_out' && 'Calling…'}
						{state.status === 'ringing_in' &&
							`Incoming ${isVideo ? 'video' : 'voice'} call`}
						{state.status === 'connecting' && 'Connecting…'}
						{state.status === 'active' &&
							(isVideo ? 'Video call' : 'Voice call')}
					</p>
				</div>

				<div className="flex items-center justify-center gap-4 pb-6 px-4">
					{state.status === 'ringing_in' && (
						<>
							<button
								type="button"
								onClick={onReject}
								className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600"
								aria-label="Decline"
							>
								<PhoneOff size={22} />
							</button>
							<button
								type="button"
								onClick={onAccept}
								className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600"
								aria-label="Accept"
							>
								<Phone size={22} />
							</button>
						</>
					)}

					{(state.status === 'ringing_out' ||
						state.status === 'connecting' ||
						state.status === 'active') && (
						<>
							{(active || state.status === 'connecting') && (
								<>
									<button
										type="button"
										onClick={onToggleMute}
										className={`w-12 h-12 rounded-full flex items-center justify-center ${
											muted ? 'bg-white/20' : 'bg-white/10'
										} hover:bg-white/25`}
										aria-label={muted ? 'Unmute' : 'Mute'}
									>
										{muted ? <MicOff size={20} /> : <Mic size={20} />}
									</button>
									{isVideo && (
										<button
											type="button"
											onClick={onToggleCamera}
											className={`w-12 h-12 rounded-full flex items-center justify-center ${
												cameraOff ? 'bg-white/20' : 'bg-white/10'
											} hover:bg-white/25`}
											aria-label={
												cameraOff ? 'Camera on' : 'Camera off'
											}
										>
											{cameraOff ? (
												<VideoOff size={20} />
											) : (
												<Video size={20} />
											)}
										</button>
									)}
								</>
							)}
							<button
								type="button"
								onClick={onEnd}
								className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600"
								aria-label="End call"
							>
								<PhoneOff size={22} />
							</button>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
