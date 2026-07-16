import { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { MessageContext } from '@/context/message.context';
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
} from '@/shared/api/groups';
import { connectGroup } from '@/shared/ws/groupClient';
import { Avatar, Button, EmptyState } from '@/shared/ui';
import {
	formatMessageTime,
	formatDayLabel,
	isSameDay,
} from '@/shared/lib/messageDisplay';
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
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import '../chat/chat.css';

const GroupChat = ({ inMobile }) => {
	const { groupId, setGroupId, messages, setMessages } =
		useContext(MessageContext);
	const { currentUser } = useSelector(selectCurrentUser);
	const { friends } = useSelector(friendSelector);
	const navigate = useNavigate();

	const [group, setGroup] = useState(null);
	const [members, setMembers] = useState([]);
	const [text, setText] = useState('');
	const [infoOpen, setInfoOpen] = useState(false);
	const [typingUserId, setTypingUserId] = useState(null);
	const [editing, setEditing] = useState(null);
	const [addOpen, setAddOpen] = useState(false);
	const socketRef = useRef(null);
	const bottomRef = useRef(null);
	const typingTimer = useRef(null);
	const typingExpire = useRef(null);

	const messagesArr = messages?.messages || [];

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
						setMessages((prev) => {
							const existing = prev?.messages || [];
							if (existing.some((m) => m.id === event.id)) return prev;
							return {
								messages: [
									...existing,
									{
										id: event.id,
										senderId: event.senderId,
										senderName: event.senderName,
										senderPhotoURL: event.senderPhotoURL,
										message: event.message,
										type: event.type,
										sentAt: event.sentAt,
										editedAt: event.editedAt,
									},
								],
							};
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
							if (typingExpire.current) clearTimeout(typingExpire.current);
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
	}, [groupId, setMessages, currentUser?.id, loadMeta]);

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
			setMessages((prev) => ({
				messages: (prev?.messages || [])
					.filter((m) => m.tempId !== tempId)
					.concat([
						{
							id: sent.id,
							senderId: sent.senderId,
							senderName: sent.senderName || currentUser.name,
							senderPhotoURL: sent.senderPhotoURL,
							message: sent.message || plain,
							type: 'text',
							sentAt: sent.sentAt,
						},
					]),
			}));
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

	if (!groupId) return null;

	return (
		<div
			className={`chat ${inMobile === 'hidden' && 'max-[650px]:hidden'} relative`}
		>
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
				<button
					type="button"
					className="p-2 rounded-lg hover:bg-black/5"
					onClick={() => setInfoOpen((v) => !v)}
					aria-label="Group info"
				>
					<Info size={18} />
				</button>
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
					return (
						<div className="w-full" key={msg.id || msg.tempId}>
							{showDay && (
								<div className="flex justify-center my-2">
									<span className="text-xs bg-black/10 px-3 py-1 rounded-full">
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
									<span className="textContent">
										{msg.message}
										{msg.editedAt && (
											<span className="text-[10px] opacity-60 ml-1">
												(edited)
											</span>
										)}
									</span>
									<span className="text-[11px] text-black/40 px-1 flex gap-2 items-center">
										{formatMessageTime(msg.sentAt)}
										{isOwn && (
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

			{/* Composer */}
			<div className="bottom">
				{editing && (
					<div className="reply-bar w-full mb-1">
						<span className="text-xs">Editing message</span>
						<button
							type="button"
							onClick={() => {
								setEditing(null);
								setText('');
							}}
						>
							<X size={14} />
						</button>
					</div>
				)}
				<div className="inputContainer w-full">
					<div className="inputEl">
						<input
							className="w-full outline-none px-3 py-3 bg-transparent text-black"
							placeholder="Message the group…"
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
					</div>
					<button
						type="button"
						className="bg-primary text-white rounded-xl p-3 disabled:opacity-50"
						disabled={!text.trim()}
						onClick={handleSend}
					>
						<Send size={18} />
					</button>
				</div>
			</div>

			{/* Info panel */}
			{infoOpen && (
				<div className="absolute inset-y-0 right-0 w-full sm:w-80 bg-secondary shadow-xl z-30 flex flex-col border-l border-black/10">
					<div className="flex items-center justify-between p-3 border-b">
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
					<div className="p-3 border-t space-y-2">
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
							<div className="bg-secondary rounded-xl p-4 w-full max-w-sm max-h-80 overflow-y-auto">
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
