import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectChats } from '../../../store/chats/chats.selector';
import { fetchChats } from '../../../store/chats/chats.reducer';
import { selectCurrentUser } from '../../../store/user/user.selector';
import { useContext } from 'react';
import { MessageContext } from '../../../context/message.context';
import { previewLastMessage, formatDayLabel } from '@/shared/lib/messageDisplay';
import { Avatar, ChatListSkeleton, EmptyState } from '@/shared/ui';
import { pinChat, unpinChat } from '@/shared/api/chats';
import { Pin } from 'lucide-react';
import { toast } from 'react-toastify';
import { isMobileLayout } from '@/shared/lib/layout';

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
		if (isMobileLayout()) {
			navigate('/chat');
		}
	};

	const handleTogglePin = async (e, chat) => {
		e.stopPropagation();
		e.preventDefault();
		try {
			if (chat.isPinned) {
				await unpinChat(chat.chatId);
				toast.success('Chat unpinned', { autoClose: 1500 });
			} else {
				await pinChat(chat.chatId);
				toast.success('Chat pinned', { autoClose: 1500 });
			}
			dispatch(fetchChats(userId));
		} catch {
			toast.error('Could not update pin');
		}
	};

	const sortedChats = [...(chats || [])].sort((a, b) => {
		if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
		return new Date(b.sentAt || 0) - new Date(a.sentAt || 0);
	});

	if (loading) return <ChatListSkeleton count={6} />;
	if (error)
		return (
			<p className="text-sm text-red-500 p-4 text-left">{String(error)}</p>
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
				const unread = !chat.isSeen;
				const pinned = Boolean(chat.isPinned);
				return (
					<div
						className="py-0.5 px-1 group/chat"
						onClick={() => handleClick(chat.chatId)}
						key={chat.chatId}
						role="button"
						tabIndex={0}
						onKeyDown={(e) =>
							e.key === 'Enter' && handleClick(chat.chatId)
						}
					>
						<div
							className={`userChat px-2 py-2.5 rounded-xl cursor-pointer transition-colors border ${
								active
									? 'bg-primary/15 border-primary/40 ring-1 ring-primary/30'
									: unread
										? 'bg-primary/10 border-transparent hover:bg-primary/15'
										: 'bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5'
							}`}
						>
							<div className="userChatImg">
								<Avatar
									src={chat.receiverPhotoURL}
									alt={chat.receiverName || 'User'}
									size={44}
								/>
							</div>
							<div className="userChatInfo min-w-0 text-left">
								<div className="userName w-full text-left">
									<span className="flex items-center gap-1.5 min-w-0">
										{pinned && (
											<Pin
												size={11}
												className="text-primary shrink-0"
												fill="currentColor"
												aria-label="Pinned"
											/>
										)}
										<span className="block truncate text-sm sm:text-base font-semibold text-black text-left">
											{chat.receiverName || '…'}
										</span>
									</span>
								</div>
								<div className="userMessage w-full text-left">
									<span className="block truncate text-xs sm:text-sm text-black/60 text-left">
										{previewLastMessage(
											chat.lastMessage,
											chat.type,
											userId,
											chat.receiverId
										)}
									</span>
								</div>
							</div>
							<div className="userChatDetails flex flex-col items-end gap-1 shrink-0">
								<div className="text-[11px] whitespace-nowrap text-black/50">
									{chat.sentAt
										? formatDayLabel(chat.sentAt)
										: ''}
								</div>
								<div className="flex items-center gap-1 min-h-[18px]">
									{unread && (
										<span
											className="inline-block w-2 h-2 rounded-full bg-primary"
											aria-label="Unread"
										/>
									)}
									<button
										type="button"
										className={`p-1 rounded-md transition-opacity ${
											pinned
												? 'text-primary opacity-100'
												: 'text-black/35 opacity-0 group-hover/chat:opacity-100 focus:opacity-100 hover:text-primary hover:bg-black/5'
										}`}
										onClick={(e) => handleTogglePin(e, chat)}
										title={pinned ? 'Unpin chat' : 'Pin chat'}
										aria-label={
											pinned ? 'Unpin chat' : 'Pin chat'
										}
										aria-pressed={pinned}
									>
										<Pin
											size={13}
											fill={pinned ? 'currentColor' : 'none'}
										/>
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
