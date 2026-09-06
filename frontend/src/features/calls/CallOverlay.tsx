import { useEffect, useRef, useState } from 'react';
import {
	Mic,
	MicOff,
	Phone,
	PhoneOff,
	Users,
	Video,
	VideoOff,
} from 'lucide-react';
import type { CallState } from './CallProvider';

interface Props {
	state: CallState;
	localStream: MediaStream | null;
	remoteStream: MediaStream | null;
	remoteStreams?: Record<string, MediaStream>;
	muted: boolean;
	cameraOff: boolean;
	onAccept: () => void;
	onReject: () => void;
	onEnd: () => void;
	onToggleMute: () => void;
	onToggleCamera: () => void;
}

function RemoteAudio({ stream }: { stream: MediaStream }) {
	const ref = useRef<HTMLAudioElement>(null);
	useEffect(() => {
		if (ref.current) ref.current.srcObject = stream;
	}, [stream]);
	return <audio ref={ref} autoPlay className="hidden" />;
}

function PeerVideo({
	stream,
	muted: videoMuted,
	className,
}: {
	stream: MediaStream | null;
	muted?: boolean;
	className?: string;
}) {
	const ref = useRef<HTMLVideoElement>(null);
	useEffect(() => {
		if (ref.current) ref.current.srcObject = stream;
	}, [stream]);
	return (
		<video
			ref={ref}
			autoPlay
			playsInline
			muted={videoMuted}
			className={className}
		/>
	);
}

function formatDuration(totalSeconds: number) {
	const m = Math.floor(totalSeconds / 60);
	const s = totalSeconds % 60;
	return `${m}:${s.toString().padStart(2, '0')}`;
}

export function CallOverlay({
	state,
	localStream,
	remoteStream,
	remoteStreams = {},
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
	const [elapsed, setElapsed] = useState(0);
	const isGroup = Boolean(state.isGroup);

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

	useEffect(() => {
		if (state.status !== 'active') {
			setElapsed(0);
			return;
		}
		const started = Date.now();
		const t = setInterval(() => {
			setElapsed(Math.floor((Date.now() - started) / 1000));
		}, 1000);
		return () => clearInterval(t);
	}, [state.status]);

	if (state.status === 'idle') return null;

	const isVideo = state.callType === 'video';
	const peerName = isGroup
		? state.groupName || 'Group'
		: state.peerName || 'User';
	const active =
		state.status === 'active' || state.status === 'connecting';
	const ringing =
		state.status === 'ringing_in' || state.status === 'ringing_out';
	const joinedCount =
		1 + (state.participants || []).filter((p) => p.joined).length;
	const remoteEntries = Object.entries(remoteStreams);

	const statusLabel =
		state.status === 'ringing_out'
			? isGroup
				? 'Calling group…'
				: 'Calling…'
			: state.status === 'ringing_in'
				? `Incoming ${isVideo ? 'video' : 'voice'} ${isGroup ? 'group ' : ''}call`
				: state.status === 'connecting'
					? 'Connecting…'
					: isVideo
						? isGroup
							? 'Group video'
							: 'Video call'
						: isGroup
							? 'Group voice'
							: 'Voice call';

	return (
		<div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-[#0b1220]">
			{/* Solid card — no transparency so chat never shows through */}
			<div className="relative w-full max-w-md overflow-hidden rounded-3xl shadow-2xl border border-[#1e2a3a] bg-[#111827] text-white">
				{/* Top accent bar */}
				<div className="h-1 w-full bg-gradient-to-r from-sky-500 via-[#0077b6] to-indigo-500" />

				<div className="relative flex flex-col items-center px-6 pt-10 pb-4 min-h-[280px] bg-[#111827]">
					{isGroup && isVideo && active ? (
						<div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-inner p-1.5">
							<div
								className={`grid gap-1.5 ${
									remoteEntries.length > 1
										? 'grid-cols-2'
										: 'grid-cols-1'
								}`}
							>
								{remoteEntries.map(([id, stream]) => {
									const p = state.participants.find(
										(x) => x.id === id
									);
									return (
										<div
											key={id}
											className="relative aspect-video rounded-xl overflow-hidden bg-slate-900"
										>
											<PeerVideo
												stream={stream}
												className="w-full h-full object-cover"
											/>
											<span className="absolute bottom-1.5 left-1.5 text-[10px] bg-black/70 px-1.5 py-0.5 rounded text-white">
												{p?.name || 'Member'}
											</span>
										</div>
									);
								})}
								<div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900">
									<PeerVideo
										stream={localStream}
										muted
										className="w-full h-full object-cover"
									/>
									<span className="absolute bottom-1.5 left-1.5 text-[10px] bg-black/70 px-1.5 py-0.5 rounded text-white">
										You
									</span>
								</div>
							</div>
							{state.status === 'active' && (
								<span className="absolute top-3 left-3 text-xs font-medium bg-[#0b1220] px-2.5 py-1 rounded-full tabular-nums text-white">
									{formatDuration(elapsed)}
								</span>
							)}
						</div>
					) : isVideo && active ? (
						<div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-inner">
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
								className="absolute bottom-3 right-3 w-28 h-20 object-cover rounded-xl border-2 border-white/40 shadow-lg bg-black"
							/>
							{state.status === 'active' && (
								<span className="absolute top-3 left-3 text-xs font-medium bg-[#0b1220] px-2.5 py-1 rounded-full tabular-nums text-white">
									{formatDuration(elapsed)}
								</span>
							)}
						</div>
					) : (
						<>
							{/* Pulse rings while ringing */}
							<div className="relative flex items-center justify-center mb-5">
								{ringing && (
									<>
										<span className="absolute w-36 h-36 rounded-full bg-sky-500/25 animate-ping" />
										<span className="absolute w-28 h-28 rounded-full bg-sky-500/20 animate-pulse" />
									</>
								)}
								{state.peerPhotoURL || state.groupAvatarURL ? (
									<img
										src={
											isGroup
												? state.groupAvatarURL ||
													state.peerPhotoURL
												: state.peerPhotoURL
										}
										alt=""
										className="relative w-28 h-28 rounded-full object-cover ring-4 ring-sky-500/50 shadow-xl bg-[#1e293b]"
										referrerPolicy="no-referrer"
									/>
								) : (
									<div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-4xl font-bold ring-4 ring-sky-500/50 shadow-xl">
										{isGroup ? (
											<Users size={40} />
										) : (
											peerName.charAt(0).toUpperCase()
										)}
									</div>
								)}
							</div>
							<audio ref={remoteAudioRef} autoPlay />
						</>
					)}

					{isVideo && (
						<audio ref={remoteAudioRef} autoPlay className="hidden" />
					)}
					{isGroup &&
						Object.entries(remoteStreams).map(([id, stream]) => (
							<RemoteAudio key={id} stream={stream} />
						))}

					<p className="mt-2 text-xl font-semibold tracking-tight text-center text-white">
						{isGroup && state.status === 'ringing_in'
							? state.peerName
							: peerName}
					</p>
					{isGroup && (
						<p className="text-xs text-slate-400 mt-0.5">
							{state.status === 'ringing_in'
								? `${state.groupName || 'Group'} · ${joinedCount} in call`
								: `${joinedCount} in call`}
						</p>
					)}
					<p className="mt-1 text-sm text-slate-300 flex items-center gap-2">
						{isVideo ? (
							<Video size={14} className="text-slate-400" />
						) : (
							<Phone size={14} className="text-slate-400" />
						)}
						{statusLabel}
						{state.status === 'active' && !isVideo && (
							<span className="tabular-nums text-sky-300 font-medium">
								· {formatDuration(elapsed)}
							</span>
						)}
					</p>
				</div>

				{/* Controls */}
				<div className="flex items-center justify-center gap-4 px-6 pb-8 pt-2 bg-[#111827]">
					{state.status === 'ringing_in' && (
						<>
							<button
								type="button"
								onClick={onReject}
								className="flex flex-col items-center gap-1.5 group"
								aria-label="Decline"
							>
								<span className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-900/40 group-hover:bg-red-600 transition-colors text-white">
									<PhoneOff size={26} />
								</span>
								<span className="text-[11px] text-slate-400">Decline</span>
							</button>
							<button
								type="button"
								onClick={onAccept}
								className="flex flex-col items-center gap-1.5 group"
								aria-label="Accept"
							>
								<span className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-900/40 group-hover:bg-emerald-600 transition-colors animate-pulse text-white">
									<Phone size={26} />
								</span>
								<span className="text-[11px] text-slate-400">Accept</span>
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
										className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
											muted
												? 'bg-white text-slate-900'
												: 'bg-slate-700 text-white hover:bg-slate-600'
										}`}
										aria-label={muted ? 'Unmute' : 'Mute'}
										title={muted ? 'Unmute' : 'Mute'}
									>
										{muted ? <MicOff size={20} /> : <Mic size={20} />}
									</button>
									{isVideo && (
										<button
											type="button"
											onClick={onToggleCamera}
											className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
												cameraOff
													? 'bg-white text-slate-900'
													: 'bg-slate-700 text-white hover:bg-slate-600'
											}`}
											aria-label={
												cameraOff ? 'Camera on' : 'Camera off'
											}
											title={
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
								className="flex flex-col items-center gap-1.5 group"
								aria-label="End call"
							>
								<span className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-900/40 group-hover:bg-red-600 transition-colors text-white">
									<PhoneOff size={26} />
								</span>
								{(state.status === 'ringing_out' ||
									state.status === 'connecting') && (
									<span className="text-[11px] text-slate-400">
										Cancel
									</span>
								)}
								{state.status === 'active' && (
									<span className="text-[11px] text-slate-400">
										End
									</span>
								)}
							</button>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
