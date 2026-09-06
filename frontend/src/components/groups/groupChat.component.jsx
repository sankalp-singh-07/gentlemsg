import { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { MessageContext } from '@/context/message.context';
import { DarkModeContext } from '@/context/dark.context';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/store/user/user.selector';
import {
	getGroup,
	getGroupMessages,
	sendGroupMessage,
	editGroupMessage,
	deleteGroupMessage,
	listMembers,
	addMembers,
	removeMember,
	leaveGroup,
	deleteGroup,
	updateGroup,
	sendGroupTyping,
	uploadGroupMedia,
} from '@/shared/api/groups';
import { connectGroup } from '@/shared/ws/groupClient';
import { Avatar, Button, EmptyState, MediaLightbox } from '@/shared/ui';
import {
	formatMessageTime,
	formatDayLabel,
	isSameDay,
} from '@/shared/lib/messageDisplay';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import { friendSelector } from '@/store/friends/friends.selector';
import {
	Users,
	Send,
	Info,
	LogOut,
	Trash2,
	UserPlus,
	X,
	Pencil,
	Smile,
	Paperclip,
	Phone,
	Video,
	FileText,
	PhoneMissed,
	PhoneOff,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import EmojiPicker from 'emoji-picker-react';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useCall } from '@/features/calls';
import SendMedia from '../messages/sendMedia';
import '../chat/chat.css';

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

function callLogLabel(payload) {
	if (!payload) return 'Group call';
	const isVideo = payload.callType === 'video';
	const kind = isVideo ? 'Video' : 'Voice';
	const status = payload.status || 'ended';
	if (status === 'missed') return `Missed ${kind.toLowerCase()} call`;
	if (status === 'rejected') return `${kind} call declined`;
	if (status === 'ended') {
		const d = payload.durationSeconds || 0;
		return d > 0
			? `Group ${kind.toLowerCase()} call · ${formatCallDuration(d)}`
			: `Group ${kind.toLowerCase()} call ended`;
	}
	return `Group ${kind.toLowerCase()} call`;
}

const GroupChat = ({ inMobile }) => {
	const { groupId, setGroupId, messages, setMessages } =
		useContext(MessageContext);
	const { isDark } = useContext(DarkModeContext);
	const { currentUser } = useSelector(selectCurrentUser);
	const { friends } = useSelector(friendSelector);
	const navigate = useNavigate();
	const { startGroupCall } = useCall();

	const [group, setGroup] = useState(null);
	const [members, setMembers] = useState([]);
	const [text, setText] = useState('');
	const [infoOpen, setInfoOpen] = useState(false);
	const [typingUserId, setTypingUserId] = useState(null);
	const [editing, setEditing] = useState(null);
	const [addOpen, setAddOpen] = useState(false);
	const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
	const [files, setFiles] = useState([]);
	const [dragOver, setDragOver] = useState(false);
	const [lightbox, setLightbox] = useState(null);
	const socketRef = useRef(null);
	const bottomRef = useRef(null);
	const typingTimer = useRef(null);
	const typingExpire = useRef(null);
	const emojiWrapRef = useRef(null);
	const fileInputRef = useRef(null);

	useClickOutside(emojiWrapRef, () => setEmojiPickerOpen(false), emojiPickerOpen);

	const messagesArr = messages?.messages || [];

	const upsertMessage = useCallback(
		(msg) => {
			setMessages((prev) => {
				const existing = prev?.messages || [];
				if (msg.id && existing.some((m) => m.id === msg.id)) {
					return {
						messages: existing.map((m) =>
							m.id === msg.id ? { ...m, ...msg, status: 'sent' } : m
						),
					};
				}
				const withoutTemp = existing.filter((m) => {
					if (msg.tempId && m.tempId === msg.tempId) return false;
					if (
						m.tempId &&
						m.senderId === msg.senderId &&
						m.message === msg.message
					) {
						return false;
					}
					return true;
				});
				if (msg.id && withoutTemp.some((m) => m.id === msg.id)) {
					return { messages: withoutTemp };
				}
				return {
					messages: [...withoutTemp, { ...msg, status: 'sent' }],
				};
			});
		},
		[setMessages]
	);

	const loadMeta = useCallback(async () => {
		if (!groupId) return;
		try {
			const [g, m] = await Promise.all([
				getGroup(groupId),
				listMembers(groupId),
			]);
			setGroup(g);
			setMembers(m);
		} catch {
			toast.error('Could not load group');
			setGroupId('');
		}
	}, [groupId, setGroupId]);

	useEffect(() => {
		if (!groupId) return;
		let cancelled = false;

		const boot = async () => {
			try {
				const data = await getGroupMessages(groupId, { limit: 50 });
				if (cancelled) return;
				setMessages({ messages: data.messages || [] });
				await loadMeta();

				const sock = connectGroup(groupId, (event) => {
					if (event.event === 'new_message') {
						upsertMessage({
							id: event.id,
							senderId: event.senderId,
							senderName: event.senderName,
							senderPhotoURL: event.senderPhotoURL,
							message: event.message,
							type: event.type,
							sentAt: event.sentAt,
							editedAt: event.editedAt,
							replyToId: event.replyToId,
						});
					} else if (event.event === 'message_edited') {
						setMessages((prev) => ({
							messages: (prev?.messages || []).map((m) =>
								m.id === event.id
									? {
											...m,
											message: event.message,
											editedAt: event.editedAt,
										}
									: m
							),
						}));
					} else if (event.event === 'message_deleted') {
						setMessages((prev) => ({
							messages: (prev?.messages || []).filter(
								(m) => m.id !== event.messageId
							),
						}));
					} else if (event.event === 'typing') {
						if (event.userId !== currentUser?.id) {
							setTypingUserId(event.userId);
							if (typingExpire.current)
								clearTimeout(typingExpire.current);
							typingExpire.current = setTimeout(
								() => setTypingUserId(null),
								2000
							);
						}
					} else if (
						event.event === 'members_updated' ||
						event.event === 'member_removed' ||
						event.event === 'group_updated'
					) {
						loadMeta();
					}
				});
				socketRef.current = sock;
				if (cancelled) sock?.close?.();
			} catch (e) {
				if (!cancelled) console.error(e);
			}
		};

		boot();
		return () => {
			cancelled = true;
			socketRef.current?.close?.();
		};
	}, [groupId, setMessages, currentUser?.id, loadMeta, upsertMessage]);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messagesArr, typingUserId]);

	const notifyTyping = () => {
		if (typingTimer.current) return;
		sendGroupTyping(groupId);
		socketRef.current?.sendTyping?.();
		typingTimer.current = setTimeout(() => {
			typingTimer.current = null;
		}, 1500);
	};

	const handleSend = async () => {
		if (!text.trim() || !groupId) return;
		const plain = text.trim();

		if (editing) {
			try {
				await editGroupMessage(groupId, editing.id, plain);
				setMessages((prev) => ({
					messages: (prev?.messages || []).map((m) =>
						m.id === editing.id
							? {
									...m,
									message: plain,
									editedAt: new Date().toISOString(),
								}
							: m
					),
				}));
				setEditing(null);
				setText('');
			} catch {
				toast.error('Edit failed');
			}
			return;
		}

		const tempId = `temp-${Date.now()}`;
		setMessages((prev) => ({
			messages: [
				...(prev?.messages || []),
				{
					id: tempId,
					tempId,
					senderId: currentUser.id,
					senderName: currentUser.name,
					senderPhotoURL: currentUser.photoURL,
					message: plain,
					type: 'text',
					sentAt: new Date().toISOString(),
					status: 'sending',
				},
			],
		}));
		setText('');

		try {
			const sent = await sendGroupMessage(groupId, plain, 'text');
			upsertMessage({
				id: sent.id,
				tempId,
				senderId: sent.senderId || currentUser.id,
				senderName: sent.senderName || currentUser.name,
				senderPhotoURL: sent.senderPhotoURL || currentUser.photoURL,
				message: sent.message || plain,
				type: sent.type || 'text',
				sentAt: sent.sentAt,
			});
		} catch {
			setMessages((prev) => ({
				messages: (prev?.messages || []).map((m) =>
					m.tempId === tempId ? { ...m, status: 'failed' } : m
				),
			}));
			toast.error('Send failed');
		}
	};

	const handleDeleteMsg = async (msg) => {
		if (!window.confirm('Delete this message?')) return;
		try {
			await deleteGroupMessage(groupId, msg.id);
			setMessages((prev) => ({
				messages: (prev?.messages || []).filter((m) => m.id !== msg.id),
			}));
		} catch {
			toast.error('Delete failed');
		}
	};

	const myRole = group?.myRole;
	const canAdmin = myRole === 'owner' || myRole === 'admin';
	const memberIds = new Set(members.map((m) => m.userId));
	const addableFriends = (friends || []).filter((f) => !memberIds.has(f.id));

	const handleLeave = async () => {
		if (!window.confirm('Leave this group?')) return;
		try {
			await leaveGroup(groupId);
			toast.info('Left group');
			setGroupId('');
		} catch (e) {
			toast.error(e?.response?.data?.detail || 'Cannot leave');
		}
	};

	const handleDeleteGroup = async () => {
		if (!window.confirm('Delete this group for everyone?')) return;
		try {
			await deleteGroup(groupId);
			toast.info('Group deleted');
			setGroupId('');
		} catch {
			toast.error('Only the owner can delete the group');
		}
	};

	const handleAddMembers = async (ids) => {
		try {
			await addMembers(groupId, ids);
			toast.success('Members added');
			setAddOpen(false);
			loadMeta();
		} catch {
			toast.error('Could not add members');
		}
	};

	const handleRemove = async (userId) => {
		if (!window.confirm('Remove this member?')) return;
		try {
			await removeMember(groupId, userId);
			loadMeta();
		} catch (e) {
			toast.error(e?.response?.data?.detail || 'Remove failed');
		}
	};

	const handleRename = async () => {
		const name = window.prompt('Group name', group?.name || '');
		if (!name?.trim()) return;
		try {
			const g = await updateGroup(groupId, { name: name.trim() });
			setGroup(g);
		} catch {
			toast.error('Rename failed');
		}
	};

	const handleEmoji = (emojiData) => {
		setText((prev) => prev + (emojiData.emoji || ''));
	};

	const startCall = (type) => {
		if (!group) return;
		startGroupCall(
			{
				id: group.id,
				name: group.name,
				avatarURL: group.avatarURL,
				members,
			},
			type
		);
	};

	const renderMedia = (msg, isOwn) => {
		const src = resolveMediaUrl(msg.message);
		if (msg.type === 'image') {
			return (
				<img
					src={src}
					alt="media"
					className="max-w-[220px] rounded-xl cursor-pointer"
					onClick={() => setLightbox({ src, type: 'image' })}
				/>
			);
		}
		if (msg.type === 'document') {
			return (
				<a
					href={src}
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
								isOwn ? 'text-white/85' : 'text-black/60'
							}`}
						>
							Tap to open PDF
						</span>
					</span>
				</a>
			);
		}
		return (
			<video
				controls
				className="max-w-[260px] rounded-xl"
				onClick={(e) => {
					e.preventDefault();
					setLightbox({ src, type: 'video' });
				}}
			>
				<source src={src} />
			</video>
		);
	};

	if (!groupId) return null;

	return (
		<div
			className={`chat ${inMobile === 'hidden' ? 'max-md:hidden' : 'chat-standalone'} relative`}
			onDragOver={(e) => {
				e.preventDefault();
				setDragOver(true);
			}}
			onDragLeave={() => setDragOver(false)}
			onDrop={(e) => {
				e.preventDefault();
				setDragOver(false);
				const dropped = Array.from(e.dataTransfer.files || []);
				if (dropped.length) setFiles(dropped);
			}}
		>
			{dragOver && (
				<div className="drop-overlay">
					<p className="text-primary font-semibold text-lg">
						Drop files to send
					</p>
				</div>
			)}

			{/* Header */}
			<div className="flex items-center justify-between h-16 w-full border-b border-[#B8D9FF]/4 px-3 shrink-0">
				<div className="flex items-center gap-2 min-w-0">
					{inMobile !== 'hidden' && (
						<button
							type="button"
							onClick={() => {
								setGroupId('');
								navigate('/admin');
							}}
						>
							◀
						</button>
					)}
					{group?.avatarURL ? (
						<Avatar src={group.avatarURL} alt={group.name} size={44} />
					) : (
						<div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center text-primary">
							<Users size={20} />
						</div>
					)}
					<div className="min-w-0">
						<p className="font-semibold text-black truncate">
							{group?.name || 'Group'}
						</p>
						<p className="text-xs text-black/50">
							{group?.memberCount || members.length} members
							{myRole ? ` · ${myRole}` : ''}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-1 shrink-0">
					<button
						type="button"
						className="p-2 rounded-lg hover:bg-black/5 text-primary"
						onClick={() => startCall('audio')}
						aria-label="Group voice call"
						title="Group voice call"
					>
						<Phone size={18} />
					</button>
					<button
						type="button"
						className="p-2 rounded-lg hover:bg-black/5 text-primary"
						onClick={() => startCall('video')}
						aria-label="Group video call"
						title="Group video call"
					>
						<Video size={18} />
					</button>
					<button
						type="button"
						className="p-2 rounded-lg hover:bg-black/5"
						onClick={() => setInfoOpen((v) => !v)}
						aria-label="Group info"
					>
						<Info size={18} />
					</button>
				</div>
			</div>

			{/* Messages */}
			<div className="middle scrollbar-hide">
				{messagesArr.length === 0 && (
					<EmptyState
						title="No messages yet"
						description="Say hello to the group!"
						className="my-auto"
					/>
				)}
				{messagesArr.map((msg, i) => {
					const isOwn = msg.senderId === currentUser?.id;
					const prev = messagesArr[i - 1];
					const showDay = !prev || !isSameDay(prev.sentAt, msg.sentAt);
					const showName =
						!isOwn && (!prev || prev.senderId !== msg.senderId);

					if (msg.type === 'call') {
						const payload = parseCallPayload(msg.message);
						const label = callLogLabel(payload);
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
							<div className="w-full" key={msg.id || msg.tempId}>
								{showDay && (
									<div className="flex justify-center my-2">
										<span className="text-xs bg-black/10 text-black/70 px-3 py-1 rounded-full">
											{formatDayLabel(msg.sentAt)}
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
											{formatMessageTime(msg.sentAt)}
										</span>
									</div>
								</div>
							</div>
						);
					}

					return (
						<div className="w-full" key={msg.id || msg.tempId}>
							{showDay && (
								<div className="flex justify-center my-2">
									<span className="text-xs bg-black/10 text-black/70 px-3 py-1 rounded-full">
										{formatDayLabel(msg.sentAt)}
									</span>
								</div>
							)}
							<div className={`message ${isOwn ? 'own' : ''}`}>
								{!isOwn && (
									<Avatar
										src={msg.senderPhotoURL}
										alt={msg.senderName}
										size={28}
										className="m-1"
									/>
								)}
								<div className={`texts ${isOwn ? 'items-end' : ''}`}>
									{showName && (
										<span className="text-[11px] text-primary font-medium px-1">
											{msg.senderName || 'Member'}
										</span>
									)}
									{msg.type && msg.type !== 'text' ? (
										<div className="media-bubble">
											{renderMedia(msg, isOwn)}
										</div>
									) : (
										<span
											className={`textContent ${
												msg.status === 'failed'
													? 'opacity-60 ring-1 ring-red-400'
													: ''
											}`}
										>
											{msg.message}
											{msg.editedAt && (
												<span className="text-[10px] opacity-60 ml-1">
													(edited)
												</span>
											)}
										</span>
									)}
									<span className="text-[11px] text-black/40 px-1 flex gap-2 items-center">
										{formatMessageTime(msg.sentAt)}
										{isOwn && msg.type === 'text' && !msg.tempId && (
											<>
												<button
													type="button"
													className="hover:text-primary"
													onClick={() => {
														setEditing(msg);
														setText(msg.message);
													}}
												>
													edit
												</button>
												<button
													type="button"
													className="hover:text-red-500"
													onClick={() => handleDeleteMsg(msg)}
												>
													delete
												</button>
											</>
										)}
										{isOwn && msg.type !== 'text' && !msg.tempId && (
											<button
												type="button"
												className="hover:text-red-500"
												onClick={() => handleDeleteMsg(msg)}
											>
												delete
											</button>
										)}
									</span>
								</div>
							</div>
						</div>
					);
				})}
				{typingUserId && (
					<p className="text-xs text-black/40 pl-2">Someone is typing…</p>
				)}
				<div ref={bottomRef} />
			</div>

			{/* Composer — column so the edit bar sits above the input */}
			<div className="bottom">
				<div className="inputContainer flex-col! w-full">
					{editing && (
						<div className="reply-bar w-full">
							<div className="min-w-0 flex-1">
								<p className="text-xs font-semibold text-primary">
									Editing
								</p>
								<p className="truncate text-black/70">
									{editing.message}
								</p>
							</div>
							<button
								type="button"
								onClick={() => {
									setEditing(null);
									setText('');
								}}
								aria-label="Cancel edit"
							>
								<X size={16} />
							</button>
						</div>
					)}
					<div className="flex items-end gap-2 w-full">
						<div className="inputEl" ref={emojiWrapRef}>
							<div className="relative">
								<button
									type="button"
									className="p-2 text-black/60 hover:text-black"
									onClick={() =>
										setEmojiPickerOpen((v) => !v)
									}
									aria-label="Emoji"
								>
									<Smile size={22} />
								</button>
								{emojiPickerOpen && (
									<div className="absolute bottom-12 left-0 z-30 shadow-xl">
										<EmojiPicker
											onEmojiClick={handleEmoji}
											width={Math.min(300, (typeof window !== 'undefined' ? window.innerWidth : 300) - 24)}
											height={Math.min(380, (typeof window !== 'undefined' ? window.innerHeight : 380) * 0.45)}
											theme={isDark ? 'dark' : 'light'}
										/>
									</div>
								)}
							</div>
							<input
								className="w-full h-full outline-none px-2 py-3 bg-transparent text-black text-base"
								placeholder={
									editing
										? 'Edit message…'
										: 'Message the group…'
								}
								value={text}
								onChange={(e) => {
									setText(e.target.value);
									notifyTyping();
								}}
								onKeyDown={(e) => {
									if (e.key === 'Enter' && !e.shiftKey) {
										e.preventDefault();
										handleSend();
									}
								}}
							/>
							<button
								type="button"
								className="p-2 text-black/60 hover:text-black"
								onClick={() => fileInputRef.current?.click()}
								aria-label="Attach"
							>
								<Paperclip size={20} />
							</button>
							<input
								type="file"
								multiple
								accept="image/*,video/*,.pdf,application/pdf"
								className="hidden"
								onChange={(e) =>
									setFiles(Array.from(e.target.files || []))
								}
								ref={fileInputRef}
							/>
						</div>
						<button
							type="button"
							className="bg-primary text-white rounded-xl p-3 disabled:opacity-50 shrink-0"
							disabled={!text.trim()}
							onClick={handleSend}
							aria-label="Send"
						>
							<Send size={18} />
						</button>
					</div>
				</div>
			</div>

			<SendMedia
				files={files}
				currentUser={currentUser}
				uploadFn={(file) => uploadGroupMedia(groupId, file)}
				onDone={() => setFiles([])}
			/>

			{lightbox && (
				<MediaLightbox
					src={lightbox.src}
					type={lightbox.type}
					onClose={() => setLightbox(null)}
				/>
			)}

			{/* Info panel */}
			{infoOpen && (
				<div className="absolute inset-y-0 right-0 w-full sm:w-80 bg-secondary shadow-xl z-30 flex flex-col border-l border-black/10 text-black">
					<div className="flex items-center justify-between p-3 border-b border-black/10">
						<h3 className="font-semibold">Group info</h3>
						<button type="button" onClick={() => setInfoOpen(false)}>
							<X size={18} />
						</button>
					</div>
					<div className="p-3 space-y-2 overflow-y-auto flex-1">
						<p className="font-medium text-lg">{group?.name}</p>
						{group?.description && (
							<p className="text-sm text-black/60">{group.description}</p>
						)}
						{canAdmin && (
							<div className="flex flex-wrap gap-2">
								<Button size="sm" variant="secondary" onClick={handleRename}>
									<Pencil size={14} className="inline mr-1" />
									Rename
								</Button>
								<Button
									size="sm"
									variant="secondary"
									onClick={() => setAddOpen(true)}
								>
									<UserPlus size={14} className="inline mr-1" />
									Add
								</Button>
							</div>
						)}
						<p className="text-xs font-semibold uppercase text-black/50 pt-2">
							Members ({members.length})
						</p>
						{members.map((m) => (
							<div
								key={m.userId}
								className="flex items-center gap-2 py-1"
							>
								<Avatar src={m.photoURL} alt={m.name} size={32} />
								<div className="min-w-0 flex-1">
									<p className="text-sm truncate">{m.name}</p>
									<p className="text-[11px] text-black/40">{m.role}</p>
								</div>
								{canAdmin &&
									m.role !== 'owner' &&
									m.userId !== currentUser?.id && (
										<button
											type="button"
											className="text-xs text-red-500"
											onClick={() => handleRemove(m.userId)}
										>
											Remove
										</button>
									)}
							</div>
						))}
					</div>
					<div className="p-3 border-t border-black/10 space-y-2">
						{myRole !== 'owner' && (
							<Button
								variant="ghost"
								className="w-full"
								onClick={handleLeave}
							>
								<LogOut size={14} className="inline mr-1" /> Leave group
							</Button>
						)}
						{myRole === 'owner' && (
							<Button
								variant="danger"
								className="w-full"
								onClick={handleDeleteGroup}
							>
								<Trash2 size={14} className="inline mr-1" /> Delete group
							</Button>
						)}
					</div>

					{addOpen && (
						<div className="absolute inset-0 bg-black/40 flex items-end sm:items-center justify-center p-4">
							<div className="bg-secondary rounded-xl p-4 w-full max-w-sm max-h-80 overflow-y-auto text-black">
								<p className="font-semibold mb-2">Add friends</p>
								{addableFriends.length === 0 && (
									<p className="text-sm text-black/50">
										All friends are already members.
									</p>
								)}
								{addableFriends.map((f) => (
									<button
										key={f.id}
										type="button"
										className="flex items-center gap-2 w-full py-2 hover:bg-tertiary rounded px-1"
										onClick={() => handleAddMembers([f.id])}
									>
										<Avatar src={f.photoURL} alt={f.name} size={32} />
										<span className="text-sm">{f.name}</span>
									</button>
								))}
								<Button
									variant="ghost"
									className="w-full mt-2"
									onClick={() => setAddOpen(false)}
								>
									Close
								</Button>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default GroupChat;
