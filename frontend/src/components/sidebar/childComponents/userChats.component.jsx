import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectChats } from '../../../store/chats/chats.selector';
import { fetchChats } from '../../../store/chats/chats.reducer';
import { selectCurrentUser } from '../../../store/user/user.selector';
import { useContext } from 'react';
import { MessageContext } from '../../../context/message.context';
import { displayTextMessage, formatDayLabel } from '@/shared/lib/messageDisplay';
import { Avatar, ChatListSkeleton, EmptyState } from '@/shared/ui';
import { pinChat, unpinChat } from '@/shared/api/chats';
import { Pin } from 'lucide-react';
import { toast } from 'react-toastify';

const UserChats = () => {
	const { chats, loading, error } = useSelector(selectChats);
	const { currentUser } = useSelector(selectCurrentUser);
	const userId = currentUser?.id;
	const dispatch = useDispatch();
	const { setChatId, chatId: activeChatId } = useContext(MessageContext);

	useEffect(() => {
		if (userId) dispatch(fetchChats(userId));
	}, [dispatch, userId]);

	const navigate = useNavigate();

	const handleClick = (chatId) => {
		setChatId(chatId);
		if (window.innerWidth <= 600) {
			navigate('/chat');
		}
	};

	const handleTogglePin = async (e, chat) => {
		e.stopPropagation();
		try {
			if (chat.isPinned) {
				await unpinChat(chat.chatId);
			} else {
				await pinChat(chat.chatId);
			}
			dispatch(fetchChats(userId));
		} catch {
			toast.error('Could not update pin');
		}
	};

	const preview = (message, receiverId, type) => {
		if (!message) return 'Start Conversation';
		if (type === 'text') {
			const text = displayTextMessage(message, userId, receiverId);
			return text.length > 28 ? `${text.slice(0, 28)}…` : text;
		}
		if (type === 'image') return '📷 Image';
		if (type === 'document') return '📄 Document';
		if (type === 'video') return '🎬 Video';
		return 'Start Conversation';
	};

	const sortedChats = [...(chats || [])].sort((a, b) => {
		if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
		return new Date(b.sentAt || 0) - new Date(a.sentAt || 0);
	});

	if (loading) return <ChatListSkeleton count={6} />;
	if (error)
		return (
			<p className="text-center text-sm text-red-500 p-4">{String(error)}</p>
		);
	if (!sortedChats.length) {
		return (
			<EmptyState
				title="No chats yet"
				description="Add friends and start a conversation."
				className="py-10"
			/>
		);
	}

	return (
		<>
			{sortedChats.map((chat) => {
				const active = activeChatId === chat.chatId;
				return (
					<div
						className="py-1"
						onClick={() => handleClick(chat.chatId)}
						key={chat.chatId}
						role="button"
						tabIndex={0}
						onKeyDown={(e) =>
							e.key === 'Enter' && handleClick(chat.chatId)
						}
					>
						<div
							className={`userChat hover:bg-tertiaryHover px-2 py-2 rounded-md cursor-pointer transition-colors ${
								active
									? 'bg-sky-100 ring-1 ring-primary/30'
									: chat.isSeen
										? 'bg-tertiary'
										: 'bg-sky-200'
							}`}
						>
							<div className="userChatImg">
								<Avatar
									src={chat.receiverPhotoURL}
									alt={chat.receiverName || 'User'}
									size={44}
								/>
							</div>
							<div className="userChatInfo min-w-0">
								<div className="userName">
									<h1 className="truncate">
										{chat.receiverName || '…'}
									</h1>
								</div>
								<div className="userMessage">
									<p className="truncate">
										{preview(
											chat.lastMessage,
											chat.receiverId,
											chat.type
										)}
									</p>
								</div>
							</div>
							<div className="userChatDetails flex flex-col items-end gap-1">
								<div className="text-xs whitespace-nowrap">
									{chat.sentAt
										? formatDayLabel(chat.sentAt)
										: ''}
								</div>
								<div className="flex items-center gap-1">
									{chat.isPinned && (
										<Pin
											size={12}
											className="text-primary"
											fill="currentColor"
										/>
									)}
									{!chat.isSeen && (
										<span className="inline-block w-2 h-2 rounded-full bg-primary" />
									)}
									<button
										type="button"
										className="text-black/30 hover:text-primary p-0.5"
										onClick={(e) => handleTogglePin(e, chat)}
										title={chat.isPinned ? 'Unpin' : 'Pin'}
										aria-label={chat.isPinned ? 'Unpin' : 'Pin'}
									>
										<Pin size={12} />
									</button>
								</div>
							</div>
						</div>
					</div>
				);
			})}
		</>
	);
};

export default UserChats;
