import { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { MessageContext } from '../../../context/message.context';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../../store/user/user.selector';
import {
	displayTextMessage,
	formatMessageTime,
	formatDayLabel,
	isSameDay,
} from '@/shared/lib/messageDisplay';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import { Avatar, MediaLightbox } from '@/shared/ui';
import {
	Copy,
	Reply,
	Pencil,
	Trash2,
	Check,
	CheckCheck,
	FileText,
	Phone,
	PhoneMissed,
	PhoneOff,
	Video,
} from 'lucide-react';
import { toast } from 'react-toastify';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

function parseCallPayload(raw) {
	try {
		return typeof raw === 'string' ? JSON.parse(raw) : raw;
	} catch {
		return null;
	}
}

function formatCallDuration(secs) {
	const n = Math.max(0, Number(secs) || 0);
	const m = Math.floor(n / 60);
	const s = n % 60;
	return `${m}:${String(s).padStart(2, '0')}`;
}

function callLogLabel(payload, currentUserId) {
	if (!payload) return 'Call';
	const isVideo = payload.callType === 'video';
	const kind = isVideo ? 'Video' : 'Voice';
	const iAmCaller = payload.callerId === currentUserId;
	const status = payload.status || 'ended';

	if (status === 'missed') {
		return iAmCaller ? `No answer · ${kind.toLowerCase()} call` : `Missed ${kind.toLowerCase()} call`;
	}
	if (status === 'rejected') {
		return iAmCaller ? `${kind} call declined` : `You declined ${kind.toLowerCase()} call`;
	}
	if (status === 'ended') {
		const d = payload.durationSeconds || 0;
		return d > 0
			? `${kind} call · ${formatCallDuration(d)}`
			: `${kind} call ended`;
	}
	return `${kind} call`;
}

const Messages = ({
	receiverImg,
	receiverId,
	onReply,
	onEdit,
	onDelete,
	onReact,
	typingUserId,
	peerLastReadId,
	currentUserLastReadId,
	onLoadOlder,
	hasMore,
	loadingOlder,
	highlightMessageId,
	highlightQuery,
}) => {
	const { messages } = useContext(MessageContext);
	const messagesArr = messages?.messages || [];
	const { currentUser } = useSelector(selectCurrentUser);

	const containerRef = useRef(null);
	const bottomRef = useRef(null);
	const stickToBottom = useRef(true);
	const [showJump, setShowJump] = useState(false);
	const [menu, setMenu] = useState(null); // { id, x, y }
	const [lightbox, setLightbox] = useState(null); // { src, type }
	const msgRefs = useRef({});

	const scrollToBottom = useCallback((smooth = true) => {
		bottomRef.current?.scrollIntoView({
			behavior: smooth ? 'smooth' : 'auto',
		});
		stickToBottom.current = true;
		setShowJump(false);
	}, []);

	useEffect(() => {
		if (stickToBottom.current && !highlightMessageId) {
			scrollToBottom(true);
		}
	}, [messagesArr, typingUserId, scrollToBottom, highlightMessageId]);

	useEffect(() => {
		if (!highlightMessageId) return;
		const el = msgRefs.current[highlightMessageId];
		if (el) {
			stickToBottom.current = false;
			setShowJump(true);
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	}, [highlightMessageId]);

	const renderHighlighted = (text) => {
		if (!highlightQuery || !text) return text;
		const q = highlightQuery.trim();
		if (q.length < 2) return text;
		try {
			const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
			return parts.map((part, i) =>
				part.toLowerCase() === q.toLowerCase() ? (
					<mark key={i} className="bg-yellow-300 text-black rounded px-0.5">
						{part}
					</mark>
				) : (
					part
				)
			);
		} catch {
			return text;
		}
	};

	const handleScroll = () => {
		const el = containerRef.current;
		if (!el) return;
		const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
		const nearBottom = distFromBottom < 100;
		stickToBottom.current = nearBottom;
		setShowJump(!nearBottom && messagesArr.length > 0);

		if (el.scrollTop < 40 && hasMore && !loadingOlder && onLoadOlder) {
			const prevHeight = el.scrollHeight;
			onLoadOlder().then?.(() => {
				requestAnimationFrame(() => {
					if (containerRef.current) {
						containerRef.current.scrollTop =
							containerRef.current.scrollHeight - prevHeight;
					}
				});
			});
		}
	};

	useEffect(() => {
		const close = () => setMenu(null);
		window.addEventListener('click', close);
		return () => window.removeEventListener('click', close);
	}, []);

	const openMenu = (e, message) => {
		e.preventDefault();
		e.stopPropagation();
		setMenu({
			id: message.id,
			message,
			x: Math.min(e.clientX, window.innerWidth - 180),
			y: Math.min(e.clientY, window.innerHeight - 200),
		});
	};

	const handleCopy = async (message) => {
		const text = displayTextMessage(
			message.message,
			currentUser?.id,
			receiverId
		);
		try {
			await navigator.clipboard.writeText(text);
			toast.success('Copied', { autoClose: 1500 });
		} catch {
			toast.error('Copy failed');
		}
		setMenu(null);
	};

	if (!currentUser) return null;

	// Find first unread message id after peer last read for divider
	// Divider shows messages the *current user* hasn't read when opening — use currentUserLastReadId
	let showUnreadAfterId = null;
	if (currentUserLastReadId && messagesArr.length) {
		const idx = messagesArr.findIndex((m) => m.id === currentUserLastReadId);
		if (idx >= 0 && idx < messagesArr.length - 1) {
			const next = messagesArr[idx + 1];
			if (next && next.senderId !== currentUser.id) {
				showUnreadAfterId = currentUserLastReadId;
			}
		}
	}

	return (
		<div className="relative flex-1 min-h-0 flex flex-col">
		<div
			ref={containerRef}
			className="middle scrollbar-hide flex-1 min-h-0"
			onScroll={handleScroll}
		>
			{loadingOlder && (
				<p className="text-center text-xs text-black/50 py-2">Loading…</p>
			)}
			{hasMore && !loadingOlder && (
				<button
					type="button"
					className="text-xs text-primary mx-auto block py-1 hover:underline"
					onClick={() => onLoadOlder?.()}
				>
					Load older messages
				</button>
			)}

			{!messagesArr.length && (
				<div className="flex-1 flex items-center justify-center py-16 px-4">
					<p className="text-sm text-black/45 text-center">
						No messages yet. Say hello!
					</p>
				</div>
			)}

			{messagesArr.map((message, index) => {
				const isOwn = message.senderId === currentUser.id;
				const prev = messagesArr[index - 1];
				const showDay =
					!prev || !isSameDay(prev.sentAt, message.sentAt);
				const showUnreadDivider =
					showUnreadAfterId && prev?.id === showUnreadAfterId;

				const textContent =
					message.type === 'text'
						? displayTextMessage(
								message.message,
								currentUser.id,
								receiverId
							)
						: null;

				const isReadByPeer =
					isOwn &&
					peerLastReadId &&
					messagesArr.findIndex((m) => m.id === peerLastReadId) >=
						messagesArr.findIndex((m) => m.id === message.id);

				const isHighlight = highlightMessageId === message.id;

				// Centered system call log (not a bubble)
				if (message.type === 'call') {
					const payload = parseCallPayload(message.message);
					const label = callLogLabel(payload, currentUser.id);
					const isMissed = payload?.status === 'missed';
					const isRejected = payload?.status === 'rejected';
					const isVideo = payload?.callType === 'video';
					const Icon = isMissed
						? PhoneMissed
						: isRejected
							? PhoneOff
							: isVideo
								? Video
								: Phone;
					return (
						<div
							className="w-full"
							key={message.id || message.tempId}
							ref={(el) => {
								if (message.id) msgRefs.current[message.id] = el;
							}}
						>
							{showDay && (
								<div className="flex justify-center my-3">
									<span className="text-xs bg-black/10 text-black/70 px-3 py-1 rounded-full">
										{formatDayLabel(message.sentAt)}
									</span>
								</div>
							)}
							<div className="flex justify-center my-2 px-2">
								<div
									className={`inline-flex items-center gap-2 text-xs sm:text-sm px-3.5 py-1.5 rounded-full border shadow-sm font-medium ${
										isMissed || isRejected
											? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
											: 'bg-quatery text-black border-black/10'
									}`}
								>
									<Icon size={14} className="shrink-0" />
									<span>{label}</span>
									<span className="opacity-70 font-normal">
										{formatMessageTime(message.sentAt)}
									</span>
								</div>
							</div>
						</div>
					);
				}

				return (
					<div
						className="w-full"
						key={message.id || message.tempId}
						ref={(el) => {
							if (message.id) msgRefs.current[message.id] = el;
						}}
					>
						{showDay && (
							<div className="flex justify-center my-3">
								<span className="text-xs bg-black/10 text-black/70 px-3 py-1 rounded-full">
									{formatDayLabel(message.sentAt)}
								</span>
							</div>
						)}
						{showUnreadDivider && (
							<div className="flex items-center gap-2 my-3 px-2">
								<div className="flex-1 h-px bg-red-400/60" />
								<span className="text-xs text-red-500 font-medium">
									Unread
								</span>
								<div className="flex-1 h-px bg-red-400/60" />
							</div>
						)}
						<div
							className={`message ${isOwn ? 'own' : ''} group ${
								isHighlight ? 'ring-2 ring-yellow-400 rounded-xl' : ''
							}`}
							onContextMenu={(e) => openMenu(e, message)}
						>
							{!isOwn && (
								<Avatar
									src={receiverImg}
									alt=""
									size={32}
									className="m-2"
								/>
							)}
							<div className={`texts ${isOwn ? 'items-end' : 'items-start'}`}>
								{message.replyTo && (
									<div className="reply-preview text-xs px-2 py-1 mb-0.5 rounded-lg bg-black/5 border-l-2 border-primary max-w-[240px] truncate">
										{message.replyTo.message}
									</div>
								)}
								{message.type === 'text' ? (
									<span
										className={`textContent text-left ${
											message.status === 'failed'
												? 'opacity-60 ring-1 ring-red-400'
												: ''
										}`}
										onDoubleClick={(e) => openMenu(e, message)}
									>
										{renderHighlighted(textContent)}
										{message.editedAt && (
											<span className="text-[10px] opacity-60 ml-1">
												(edited)
											</span>
										)}
									</span>
								) : (
									<div className="media-bubble">
										{message.type === 'image' ? (
											<img
												src={resolveMediaUrl(message.message)}
												alt="media"
												className="max-w-[220px] rounded-xl cursor-pointer"
												onClick={() =>
													setLightbox({
														src: resolveMediaUrl(message.message),
														type: 'image',
													})
												}
											/>
										) : message.type === 'document' ? (
											<a
												href={resolveMediaUrl(message.message)}
												target="_blank"
												rel="noopener noreferrer"
												className={`inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold shadow-md border transition-opacity hover:opacity-90 ${
													isOwn
														? 'bg-primary text-white border-primary/80'
														: 'bg-secondary text-black border-black/15'
												}`}
											>
												<span
													className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${
														isOwn
															? 'bg-white/20 text-white'
															: 'bg-primary/15 text-primary'
													}`}
												>
													<FileText size={18} strokeWidth={2} />
												</span>
												<span className="text-left leading-tight">
													<span className="block">Document</span>
													<span
														className={`block text-[11px] font-normal ${
															isOwn
																? 'text-white/85'
																: 'text-black/60'
														}`}
													>
														Tap to open PDF
													</span>
												</span>
											</a>
										) : (
											<video
												controls
												className="max-w-[260px] rounded-xl cursor-pointer"
												onClick={(e) => {
													e.preventDefault();
													setLightbox({
														src: resolveMediaUrl(message.message),
														type: 'video',
													});
												}}
											>
												<source
													src={resolveMediaUrl(message.message)}
												/>
											</video>
										)}
									</div>
								)}
								{/* Reactions */}
								{message.reactions?.length > 0 && (
									<div className="flex flex-wrap gap-1 mt-0.5 px-0.5">
										{message.reactions.map((r) => (
											<button
												key={r.emoji}
												type="button"
												className={`text-xs px-1.5 py-0.5 rounded-full bg-black/5 hover:bg-black/10 border ${
													r.userIds?.includes(currentUser.id)
														? 'border-primary'
														: 'border-transparent'
												}`}
												onClick={() => onReact?.(message, r.emoji)}
												title={`${r.count}`}
											>
												{r.emoji} {r.count > 1 ? r.count : ''}
											</button>
										))}
									</div>
								)}
								<span className="meta flex items-center gap-1 text-[11px] text-black/50 mt-0.5 px-1">
									{formatMessageTime(message.sentAt)}
									{message.status === 'sending' && ' · sending'}
									{message.status === 'failed' && (
										<button
											type="button"
											className="text-red-500 underline"
											onClick={() =>
												onEdit?.({ ...message, _retry: true })
											}
										>
											retry
										</button>
									)}
									{isOwn && message.status !== 'sending' && (
										<span className="inline-flex" title={isReadByPeer ? 'Read' : 'Sent'}>
											{isReadByPeer ? (
												<CheckCheck size={12} className="text-primary" />
											) : (
												<Check size={12} />
											)}
										</span>
									)}
								</span>
							</div>
						</div>
					</div>
				);
			})}

			{typingUserId && typingUserId !== currentUser.id && (
				<div className="flex items-center gap-2 pl-2 text-sm text-black/50">
					<span className="typing-dots">
						<span /><span /><span />
					</span>
					typing…
				</div>
			)}

			<div ref={bottomRef} />
		</div>

			{showJump && (
				<button
					type="button"
					className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 bg-primary text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg hover:opacity-90 whitespace-nowrap"
					onClick={() => scrollToBottom(true)}
				>
					Jump to latest
				</button>
			)}

			{menu && (
				<div
					className="fixed z-50 bg-secondary shadow-lg rounded-lg border border-black/10 py-1 min-w-[160px]"
					style={{ left: menu.x, top: menu.y }}
					onClick={(e) => e.stopPropagation()}
				>
					<div className="flex gap-1 px-2 py-1.5 border-b border-black/5">
						{QUICK_REACTIONS.map((emoji) => (
							<button
								key={emoji}
								type="button"
								className="text-base hover:scale-125 transition"
								onClick={() => {
									onReact?.(menu.message, emoji);
									setMenu(null);
								}}
							>
								{emoji}
							</button>
						))}
					</div>
					<button
						type="button"
						className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-black/5 text-left"
						onClick={() => handleCopy(menu.message)}
					>
						<Copy size={14} /> Copy
					</button>
					<button
						type="button"
						className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-black/5 text-left"
						onClick={() => {
							onReply?.(menu.message);
							setMenu(null);
						}}
					>
						<Reply size={14} /> Reply
					</button>
					{menu.message.senderId === currentUser.id &&
						menu.message.type === 'text' && (
							<button
								type="button"
								className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-black/5 text-left"
								onClick={() => {
									onEdit?.(menu.message);
									setMenu(null);
								}}
							>
								<Pencil size={14} /> Edit
							</button>
						)}
					{menu.message.senderId === currentUser.id && (
						<button
							type="button"
							className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-red-50 text-red-600 text-left"
							onClick={() => {
								onDelete?.(menu.message);
								setMenu(null);
							}}
						>
							<Trash2 size={14} /> Delete
						</button>
					)}
				</div>
			)}

			<MediaLightbox
				src={lightbox?.src || null}
				type={lightbox?.type || 'image'}
				onClose={() => setLightbox(null)}
			/>
		</div>
	);
};

export default Messages;
