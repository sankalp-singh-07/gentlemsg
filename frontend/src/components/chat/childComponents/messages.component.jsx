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
import { Avatar } from '@/shared/ui';
import { Copy, Reply, Pencil, Trash2, Check, CheckCheck } from 'lucide-react';
import { toast } from 'react-toastify';

const Messages = ({
	receiverImg,
	receiverId,
	onReply,
	onEdit,
	onDelete,
	typingUserId,
	peerLastReadId,
	currentUserLastReadId,
	onLoadOlder,
	hasMore,
	loadingOlder,
}) => {
	const { messages } = useContext(MessageContext);
	const messagesArr = messages?.messages || [];
	const { currentUser } = useSelector(selectCurrentUser);

	const containerRef = useRef(null);
	const bottomRef = useRef(null);
	const stickToBottom = useRef(true);
	const [menu, setMenu] = useState(null); // { id, x, y }

	const scrollToBottom = useCallback((smooth = true) => {
		bottomRef.current?.scrollIntoView({
			behavior: smooth ? 'smooth' : 'auto',
		});
	}, []);

	useEffect(() => {
		if (stickToBottom.current) {
			scrollToBottom(true);
		}
	}, [messagesArr, typingUserId, scrollToBottom]);

	const handleScroll = () => {
		const el = containerRef.current;
		if (!el) return;
		const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
		stickToBottom.current = distFromBottom < 80;

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
		<div
			ref={containerRef}
			className="middle scrollbar-hide relative"
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

				return (
					<div key={message.id || message.tempId}>
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
							className={`message ${isOwn ? 'own' : ''} group`}
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
										{textContent}
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
													window.open(
														resolveMediaUrl(message.message),
														'_blank'
													)
												}
											/>
										) : message.type === 'document' ? (
											<a
												href={resolveMediaUrl(message.message)}
												target="_blank"
												rel="noopener noreferrer"
												className="inline-block bg-primary text-tertiary px-3 py-2 rounded-lg text-sm"
											>
												View document
											</a>
										) : (
											<video
												controls
												className="max-w-[260px] rounded-xl"
											>
												<source
													src={resolveMediaUrl(message.message)}
												/>
											</video>
										)}
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

			{!stickToBottom.current && messagesArr.length > 0 && (
				<button
					type="button"
					className="sticky bottom-2 left-1/2 -translate-x-1/2 bg-primary text-white text-xs px-3 py-1.5 rounded-full shadow z-10"
					onClick={() => {
						stickToBottom.current = true;
						scrollToBottom(true);
					}}
				>
					Jump to latest
				</button>
			)}

			{menu && (
				<div
					className="fixed z-50 bg-secondary shadow-lg rounded-lg border border-black/10 py-1 min-w-[140px]"
					style={{ left: menu.x, top: menu.y }}
					onClick={(e) => e.stopPropagation()}
				>
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
		</div>
	);
};

export default Messages;
