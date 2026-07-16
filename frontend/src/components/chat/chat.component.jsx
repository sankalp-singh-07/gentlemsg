import React, {
	useState,
	useEffect,
	useLayoutEffect,
	useRef,
	useCallback,
	useContext,
} from 'react';
import './chat.css';
import Messages from './childComponents/messages.component';
import EmojiPicker from 'emoji-picker-react';
import { MessageContext } from '../../context/message.context';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser } from '../../store/user/user.selector';
import { selectChats } from '../../store/chats/chats.selector';
import { markChatAsRead } from '../../store/chats/chats.reducer';
import * as chatService from '../../services/chatService';
import * as userService from '../../services/userService';
import { connectChat } from '../../services/websocket';
import { useNavigate } from 'react-router-dom';
import ChatsDialog from './childComponents/chatsDialog.component';
import SendMedia from '../messages/sendMedia';
import { friendSelector } from '../../store/friends/friends.selector';
import { DarkModeContext } from '../../context/dark.context';
import { DialogContext } from '../../context/dialog.context';
import Media from './childComponents/media.component';
import { Avatar } from '@/shared/ui';
import { formatLastSeen, displayTextMessage } from '@/shared/lib/messageDisplay';
import { X, Smile, Paperclip, Send, Search, Phone, Video } from 'lucide-react';
import { toast } from 'react-toastify';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useCall } from '@/features/calls';
import { getDraft, setDraft, clearDraft } from '@/shared/lib/drafts';

const Chat = ({ inMobile }) => {
	const { chatId, setMessages, messages, clearConversation } =
		useContext(MessageContext);
	const { currentUser } = useSelector(selectCurrentUser);
	const { chats } = useSelector(selectChats);
	const { blocked } = useSelector(friendSelector);
	const dispatch = useDispatch();
	const { isDark } = useContext(DarkModeContext);
	const navigate = useNavigate();
	const { startCall } = useCall();

	const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
	const [receiverData, setReceiverData] = useState({});
	const [text, setText] = useState('');
	const [replyTo, setReplyTo] = useState(null);
	const [editing, setEditing] = useState(null);
	const [typingUserId, setTypingUserId] = useState(null);
	const [peerLastReadId, setPeerLastReadId] = useState(null);
	const [myLastReadId, setMyLastReadId] = useState(null);
	const [hasMore, setHasMore] = useState(false);
	const [loadingOlder, setLoadingOlder] = useState(false);
	const [dragOver, setDragOver] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const [searchQ, setSearchQ] = useState('');
	const [searchHits, setSearchHits] = useState([]);
	const [searchIdx, setSearchIdx] = useState(0);
	const [highlightId, setHighlightId] = useState(null);
	const [isUserBlocked, setIsUserBlocked] = useState(false);
	const [blockText, setBlockText] = useState('');
	const [files, setFiles] = useState([]);
	const [messagesLoading, setMessagesLoading] = useState(false);
	const [messagesError, setMessagesError] = useState(null);
	const [reloadKey, setReloadKey] = useState(0);

	const fileInputRef = useRef(null);
	const textBoxRef = useRef(null);
	const emojiWrapRef = useRef(null);
	const typingTimer = useRef(null);
	const typingExpire = useRef(null);
	const chatSocketRef = useRef(null);
	const loadSeqRef = useRef(0);

	useClickOutside(emojiWrapRef, () => setEmojiPickerOpen(false), emojiPickerOpen);

	// Load draft when chat changes
	useEffect(() => {
		if (!chatId) return;
		setText(getDraft(chatId));
	}, [chatId]);

	// Persist draft
	useEffect(() => {
		if (!chatId || editing) return;
		const t = setTimeout(() => setDraft(chatId, text), 300);
		return () => clearTimeout(t);
	}, [text, chatId, editing]);

	// Blocked status
	useEffect(() => {
		if (!blocked || !chatId || !currentUser) return;
		let blockedStatus = false;
		let textMessage = '';
		for (const id in blocked) {
			if (id === chatId) {
				blockedStatus = true;
				textMessage =
					blocked[id].blockedBy === currentUser.id
						? 'You have blocked this user'
						: 'You are blocked by this user';
				break;
			}
		}
		setIsUserBlocked(blockedStatus);
		setBlockText(textMessage);
		if (blockedStatus) setText('');
	}, [blocked, chatId, currentUser]);

	// Receiver profile
	useEffect(() => {
		if (!currentUser || !chatId) return;
		const fetchReceiver = async () => {
			try {
				let receiverId = null;
				const currentChat = chats?.find((c) => c.chatId === chatId);
				if (currentChat) receiverId = currentChat.receiverId;

				if (!receiverId) {
					const remoteChat = await chatService.getChat(chatId);
					if (remoteChat) {
						receiverId =
							remoteChat.user1_id === currentUser.id
								? remoteChat.user2_id
								: remoteChat.user1_id;
					}
				}
				if (!receiverId) return;

				const data = await userService.getUser(receiverId);
				setReceiverData({
					id: data.id,
					userName: data.userName,
					photoURL: data.photoURL,
					isOnline: data.isOnline,
					name: data.name,
					lastActive: data.lastActive,
				});
			} catch (error) {
				console.error('Error fetching receiver:', error);
			}
		};
		fetchReceiver();
	}, [chatId, currentUser, chats]);

	const upsertMessage = useCallback(
		(msg) => {
			setMessages((prev) => {
				const existing = prev?.messages || [];
				if (existing.some((m) => m.id === msg.id)) {
					return {
						messages: existing.map((m) =>
							m.id === msg.id ? { ...m, ...msg, status: 'sent' } : m
						),
					};
				}
				// replace temp optimistic
				const withoutTemp = existing.filter(
					(m) => !(m.tempId && m.message === msg.message && m.senderId === msg.senderId)
				);
				return { messages: [...withoutTemp, { ...msg, status: 'sent' }] };
			});
		},
		[setMessages]
	);

	// Load messages + WS
	// Depend on currentUser?.id (not whole object) to avoid cancel/refetch races.
	const currentUserId = currentUser?.id;

	// Show loading immediately when chat switches (before paint) to avoid empty flash
	useLayoutEffect(() => {
		if (!chatId) return;
		setMessagesLoading(true);
		setMessagesError(null);
		setReplyTo(null);
		setEditing(null);
		setHasMore(false);
		setPeerLastReadId(null);
		setMyLastReadId(null);
		setTypingUserId(null);
	}, [chatId, reloadKey]);

	useEffect(() => {
		if (!chatId) return;
		let cancelled = false;
		const seq = ++loadSeqRef.current;

		const fetchAndConnect = async () => {
			try {
				const data = await chatService.getMessages(chatId, { limit: 50 });
				if (cancelled || seq !== loadSeqRef.current) return;
				setMessages({ messages: data.messages || [] });
				setHasMore(Boolean(data.hasMore));
				setMessagesLoading(false);

				const lastRead = data.lastRead;
				if (lastRead && currentUserId) {
					if (lastRead.user1Id === currentUserId) {
						setMyLastReadId(lastRead.user1);
						setPeerLastReadId(lastRead.user2);
					} else {
						setMyLastReadId(lastRead.user2);
						setPeerLastReadId(lastRead.user1);
					}
				}

				const msgs = data.messages || [];
				const lastId = msgs.length ? msgs[msgs.length - 1].id : null;
				try {
					await chatService.markAsRead(chatId, lastId);
				} catch {
					/* non-fatal */
				}
				if (cancelled || seq !== loadSeqRef.current) return;
				dispatch(markChatAsRead(chatId));
				if (lastId) setMyLastReadId(lastId);

				const socket = connectChat(chatId, (event) => {
					if (event.event === 'new_message') {
						upsertMessage({
							id: event.id,
							senderId: event.senderId,
							message: event.message,
							type: event.type,
							sentAt: event.sentAt,
							replyToId: event.replyToId,
							editedAt: event.editedAt,
							replyTo: event.replyTo,
						});
						// Mark read if from peer and chat is open
						if (event.senderId !== currentUserId) {
							chatService.markAsRead(chatId, event.id);
							setMyLastReadId(event.id);
						}
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
						if (event.userId !== currentUserId) {
							setTypingUserId(event.userId);
							if (typingExpire.current) clearTimeout(typingExpire.current);
							typingExpire.current = setTimeout(
								() => setTypingUserId(null),
								2000
							);
						}
					} else if (event.event === 'messages_read') {
						if (event.userId !== currentUserId) {
							setPeerLastReadId(event.lastReadMessageId);
						}
					} else if (event.event === 'reaction_updated') {
						setMessages((prev) => ({
							messages: (prev?.messages || []).map((m) =>
								m.id === event.messageId
									? { ...m, reactions: event.reactions || [] }
									: m
							),
						}));
					}
				});
				chatSocketRef.current = socket;
				if (cancelled || seq !== loadSeqRef.current) socket?.close?.();
			} catch (error) {
				if (!cancelled && seq === loadSeqRef.current) {
					console.error('Error fetching messages:', error);
					const status = error?.response?.status;
					// Stale/foreign chat — leave the pane instead of a permanent error
					if (status === 403 || status === 404) {
						clearConversation();
						return;
					}
					setMessagesLoading(false);
					setMessagesError('Could not load messages. Try again.');
					setMessages({ messages: [] });
				}
			}
		};

		fetchAndConnect();

		return () => {
			cancelled = true;
			chatSocketRef.current?.close?.();
			chatSocketRef.current = null;
			if (typingExpire.current) clearTimeout(typingExpire.current);
		};
	}, [
		chatId,
		setMessages,
		dispatch,
		currentUserId,
		upsertMessage,
		reloadKey,
		clearConversation,
	]);

	useEffect(() => {
		if (!isUserBlocked) textBoxRef.current?.focus();
	}, [isUserBlocked, chatId]);

	const notifyTyping = () => {
		if (!chatId || isUserBlocked) return;
		if (typingTimer.current) return;
		chatService.sendTypingIndicator(chatId);
		// Prefer WS typing if available
		chatSocketRef.current?.sendTyping?.();
		typingTimer.current = setTimeout(() => {
			typingTimer.current = null;
		}, 1500);
	};

	const handleEmoji = (e) => {
		setText((prev) => prev + e.emoji);
		setEmojiPickerOpen(false);
		textBoxRef.current?.focus();
	};

	const handleSend = async () => {
		if (text.trim() === '' || isUserBlocked || !receiverData.id) return;
		const plainText = text.trim();

		if (editing) {
			try {
				const updated = await chatService.editMessage(
					chatId,
					editing.id,
					plainText
				);
				setMessages((prev) => ({
					messages: (prev?.messages || []).map((m) =>
						m.id === editing.id
							? {
									...m,
									message: updated.message || plainText,
									editedAt: updated.editedAt || new Date().toISOString(),
								}
							: m
					),
				}));
				setEditing(null);
				setText('');
			} catch (e) {
				toast.error('Failed to edit message');
			}
			return;
		}

		const tempId = `temp-${Date.now()}`;
		const optimistic = {
			id: tempId,
			tempId,
			senderId: currentUser.id,
			message: plainText,
			type: 'text',
			sentAt: new Date().toISOString(),
			replyToId: replyTo?.id || null,
			replyTo: replyTo
				? {
						id: replyTo.id,
						senderId: replyTo.senderId,
						message: displayTextMessage(
							replyTo.message,
							currentUser.id,
							receiverData.id
						).slice(0, 80),
						type: replyTo.type,
					}
				: null,
			status: 'sending',
		};
		setMessages((prev) => ({
			messages: [...(prev?.messages || []), optimistic],
		}));
		setText('');
		clearDraft(chatId);
		const replySnapshot = replyTo;
		setReplyTo(null);

		try {
			const sent = await chatService.sendMessage(
				chatId,
				plainText,
				'text',
				replySnapshot?.id
			);
			upsertMessage({
				id: sent.id,
				senderId: sent.senderId || currentUser.id,
				message: sent.message || plainText,
				type: sent.type || 'text',
				sentAt: sent.sentAt || new Date().toISOString(),
				replyToId: sent.replyToId,
				editedAt: sent.editedAt,
				replyTo: sent.replyTo || optimistic.replyTo,
			});
		} catch (error) {
			console.error('Error sending message:', error);
			setMessages((prev) => ({
				messages: (prev?.messages || []).map((m) =>
					m.tempId === tempId ? { ...m, status: 'failed' } : m
				),
			}));
			toast.error('Message failed to send');
		}
	};

	const handleEnterSend = (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const handleDelete = async (message) => {
		if (!window.confirm('Delete this message?')) return;
		try {
			await chatService.deleteMessage(chatId, message.id);
			setMessages((prev) => ({
				messages: (prev?.messages || []).filter((m) => m.id !== message.id),
			}));
		} catch {
			toast.error('Could not delete message');
		}
	};

	const handleEdit = (message) => {
		if (message._retry && message.status === 'failed') {
			setText(message.message);
			setMessages((prev) => ({
				messages: (prev?.messages || []).filter((m) => m.tempId !== message.tempId),
			}));
			return;
		}
		setEditing(message);
		setText(
			displayTextMessage(message.message, currentUser.id, receiverData.id)
		);
		setReplyTo(null);
		textBoxRef.current?.focus();
	};

	const handleReply = (message) => {
		setReplyTo(message);
		setEditing(null);
		textBoxRef.current?.focus();
	};

	const handleReact = async (message, emoji) => {
		if (!message?.id || !chatId) return;
		try {
			const result = await chatService.toggleReaction(
				chatId,
				message.id,
				emoji
			);
			setMessages((prev) => ({
				messages: (prev?.messages || []).map((m) =>
					m.id === message.id
						? { ...m, reactions: result.reactions || [] }
						: m
				),
			}));
		} catch {
			toast.error('Could not react');
		}
	};

	const loadOlder = async () => {
		const list = messages?.messages || [];
		if (!list.length || loadingOlder) return;
		setLoadingOlder(true);
		try {
			const data = await chatService.getMessages(chatId, {
				limit: 40,
				beforeId: list[0].id,
			});
			const older = data.messages || [];
			setHasMore(Boolean(data.hasMore) && older.length > 0);
			if (older.length) {
				setMessages((prev) => ({
					messages: [...older, ...(prev?.messages || [])],
				}));
			}
		} catch (e) {
			console.error(e);
		} finally {
			setLoadingOlder(false);
		}
	};

	const handleSearch = async () => {
		const q = searchQ.trim();
		if (q.length < 2) return;
		const qLower = q.toLowerCase();

		// 1) Server search (plain-text messages in DB)
		let serverHits = [];
		try {
			const res = await chatService.searchChatMessages(chatId, q);
			serverHits = res.messages || [];
		} catch (e) {
			console.warn('Server search failed, using local only', e);
		}

		// 2) Local search on loaded messages (handles legacy encrypted display text)
		const localHits = (messages?.messages || []).filter((m) => {
			if (m.type && m.type !== 'text') return false;
			const text = displayTextMessage(
				m.message,
				currentUser?.id,
				receiverData?.id
			);
			return (text || '').toLowerCase().includes(qLower);
		});

		// 3) Merge by id (local first so display fields are complete)
		const map = new Map();
		[...serverHits, ...localHits].forEach((m) => {
			if (m?.id) map.set(m.id, m);
		});
		// Chronological for prev/next
		const ordered = [...map.values()].sort((a, b) => {
			const ta = new Date(a.sentAt || 0).getTime();
			const tb = new Date(b.sentAt || 0).getTime();
			return ta - tb;
		});

		setSearchHits(ordered);
		setSearchIdx(0);
		if (ordered.length) {
			setHighlightId(ordered[0].id);
		} else {
			setHighlightId(null);
			toast.info('No matches');
		}
	};

	const jumpSearch = (dir) => {
		if (!searchHits.length) return;
		const next =
			(searchIdx + dir + searchHits.length) % searchHits.length;
		setSearchIdx(next);
		setHighlightId(searchHits[next].id);
	};

	const onDropFiles = (e) => {
		e.preventDefault();
		setDragOver(false);
		if (isUserBlocked) return;
		const dropped = Array.from(e.dataTransfer.files || []);
		if (dropped.length) setFiles(dropped);
	};

	const { openMediaDialog } = useContext(DialogContext);
	const handleBack = () => navigate('/admin');

	return (
		<div
			className={`chat ${inMobile === 'hidden' && 'max-[650px]:hidden'} relative`}
			onDragOver={(e) => {
				e.preventDefault();
				if (!isUserBlocked) setDragOver(true);
			}}
			onDragLeave={() => setDragOver(false)}
			onDrop={onDropFiles}
		>
			{dragOver && (
				<div className="drop-overlay">
					<p className="text-primary font-semibold text-lg">Drop files to send</p>
				</div>
			)}

			{/* Header */}
			<div className="flex items-center justify-between h-16 w-full border-b border-[#B8D9FF]/4 px-2 sm:px-4 shrink-0">
				<div className="userDetails min-w-0">
					{inMobile !== 'hidden' && (
						<button
							type="button"
							className="sm:text-2xl text-xl px-1"
							onClick={handleBack}
							aria-label="Back"
						>
							◀
						</button>
					)}
					<Avatar
						src={receiverData.photoURL}
						alt={receiverData.name || 'User'}
						size={44}
					/>
					<div className="currentStatus min-w-0">
						<span className="text-black font-semibold text-sm sm:text-base truncate">
							{receiverData.userName || receiverData.name || '…'}
						</span>
						<p className="text-xs text-black/60 truncate">
							{formatLastSeen(receiverData.lastActive, receiverData.isOnline)}
						</p>
					</div>
				</div>
				<div className="icons gap-2">
					{receiverData.id && !isUserBlocked && (
						<>
							<button
								type="button"
								className="p-2 rounded-lg hover:bg-black/5 text-primary"
								onClick={() =>
									startCall(
										{
											id: receiverData.id,
											name:
												receiverData.name ||
												receiverData.userName,
											photoURL: receiverData.photoURL,
										},
										'audio'
									)
								}
								aria-label="Voice call"
								title="Voice call"
							>
								<Phone size={18} />
							</button>
							<button
								type="button"
								className="p-2 rounded-lg hover:bg-black/5 text-primary"
								onClick={() =>
									startCall(
										{
											id: receiverData.id,
											name:
												receiverData.name ||
												receiverData.userName,
											photoURL: receiverData.photoURL,
										},
										'video'
									)
								}
								aria-label="Video call"
								title="Video call"
							>
								<Video size={18} />
							</button>
						</>
					)}
					<button
						type="button"
						className="p-2 rounded-lg hover:bg-black/5"
						onClick={() => setSearchOpen((v) => !v)}
						aria-label="Search in chat"
					>
						<Search size={18} />
					</button>
					<ChatsDialog />
				</div>
				{openMediaDialog && <Media />}
			</div>

			{searchOpen && (
				<div className="chat-search-bar shrink-0 flex flex-col sm:flex-row gap-2 px-3 py-2 border-b border-black/10 bg-quatery/40">
					<input
						value={searchQ}
						onChange={(e) => setSearchQ(e.target.value)}
						onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
						placeholder="Search messages…"
						className="flex-1 w-full min-w-0 bg-quatery text-black rounded-lg px-3 py-2 text-sm outline-none border border-black/10 focus:border-primary"
						autoFocus
					/>
					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							className="text-sm bg-primary text-white px-3 py-2 rounded-lg hover:opacity-90"
							onClick={handleSearch}
						>
							Go
						</button>
						{searchHits.length > 0 && (
							<>
								<span className="text-xs text-black/60 whitespace-nowrap">
									{searchIdx + 1}/{searchHits.length}
								</span>
								<button
									type="button"
									className="text-xs px-2 py-1.5 rounded-md bg-black/5 text-black hover:bg-black/10"
									onClick={() => jumpSearch(-1)}
								>
									Prev
								</button>
								<button
									type="button"
									className="text-xs px-2 py-1.5 rounded-md bg-black/5 text-black hover:bg-black/10"
									onClick={() => jumpSearch(1)}
								>
									Next
								</button>
							</>
						)}
						<button
							type="button"
							className="text-xs px-2 py-1.5 rounded-md text-black/50 hover:text-black"
							onClick={() => {
								setSearchOpen(false);
								setSearchHits([]);
								setHighlightId(null);
							}}
						>
							Close
						</button>
					</div>
				</div>
			)}

			{/* Messages pane */}
			<div className="chat-messages-wrap relative flex-1 min-h-0 flex flex-col">
				{messagesLoading && !(messages?.messages?.length) ? (
					<div className="flex-1 flex items-center justify-center text-sm text-black/50">
						Loading messages…
					</div>
				) : messagesError && !(messages?.messages?.length) ? (
					<div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 text-center">
						<p className="text-sm text-red-500">{messagesError}</p>
						<button
							type="button"
							className="text-sm bg-primary text-white px-4 py-2 rounded-lg"
							onClick={() => setReloadKey((k) => k + 1)}
						>
							Retry
						</button>
					</div>
				) : (
					<Messages
						receiverImg={receiverData.photoURL}
						receiverId={receiverData.id || ''}
						onReply={handleReply}
						onEdit={handleEdit}
						onDelete={handleDelete}
						onReact={handleReact}
						typingUserId={typingUserId}
						peerLastReadId={peerLastReadId}
						currentUserLastReadId={myLastReadId}
						onLoadOlder={loadOlder}
						hasMore={hasMore}
						loadingOlder={loadingOlder}
						highlightMessageId={highlightId}
						highlightQuery={searchHits.length ? searchQ : ''}
					/>
				)}
			</div>

			{/* Composer */}
			<div className="bottom">
				<div className="inputContainer flex-col! w-full">
					{(replyTo || editing) && (
						<div className="reply-bar w-full">
							<div className="min-w-0 flex-1">
								<p className="text-xs font-semibold text-primary">
									{editing ? 'Editing' : 'Replying'}
								</p>
								<p className="truncate text-black/70">
									{displayTextMessage(
										(editing || replyTo).message,
										currentUser?.id,
										receiverData.id
									)}
								</p>
							</div>
							<button
								type="button"
								onClick={() => {
									setReplyTo(null);
									setEditing(null);
									if (editing) setText('');
								}}
								aria-label="Cancel"
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
									onClick={() => setEmojiPickerOpen((v) => !v)}
									aria-label="Emoji"
									disabled={isUserBlocked}
								>
									<Smile size={22} />
								</button>
								{emojiPickerOpen && (
									<div className="absolute bottom-12 left-0 z-30 shadow-xl">
										<EmojiPicker
											onEmojiClick={handleEmoji}
											width={300}
											height={380}
											theme={isDark ? 'dark' : 'light'}
										/>
									</div>
								)}
							</div>
							<input
								type="text"
								placeholder={
									isUserBlocked
										? blockText
										: editing
											? 'Edit message…'
											: 'Type a message'
								}
								className="w-full h-full outline-none px-2 py-3 bg-transparent text-black"
								onChange={(e) => {
									setText(e.target.value);
									notifyTyping();
								}}
								onKeyDown={handleEnterSend}
								value={text}
								disabled={isUserBlocked}
								ref={textBoxRef}
							/>
							<button
								type="button"
								className="p-2 text-black/60 hover:text-black"
								onClick={() => fileInputRef.current?.click()}
								aria-label="Attach"
								disabled={isUserBlocked}
							>
								<Paperclip size={20} />
							</button>
							<input
								type="file"
								multiple
								className="hidden"
								onChange={(e) =>
									setFiles(Array.from(e.target.files || []))
								}
								ref={fileInputRef}
								disabled={isUserBlocked}
							/>
						</div>
						<button
							type="button"
							className="bg-primary text-white rounded-xl p-3 drop-shadow shrink-0 disabled:opacity-50"
							onClick={handleSend}
							disabled={isUserBlocked || !text.trim()}
							aria-label="Send"
						>
							<Send size={20} />
						</button>
					</div>
				</div>
			</div>

			<SendMedia
				files={files}
				currentUser={currentUser}
				receiverData={receiverData}
				isUserBlocked={isUserBlocked}
			/>
		</div>
	);
};

export default Chat;
