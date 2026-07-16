import React, { useContext, useEffect, useRef, useState } from 'react';
import { DialogContext } from '../../../context/dialog.context';
import { MessageContext } from '../../../context/message.context';
import { useDispatch, useSelector } from 'react-redux';
import { friendSelector } from '../../../store/friends/friends.selector';
import { selectCurrentUser } from '../../../store/user/user.selector';
import { selectChats } from '../../../store/chats/chats.selector';
import { fetchChats } from '../../../store/chats/chats.reducer';
import { getInitialData } from '../../../store/thunks/thunks';
import * as friendService from '../../../services/friendService';
import { pinChat, unpinChat } from '@/shared/api/chats';
import dots1 from '../../../assets/dots1.png';
import dots2 from '../../../assets/dots.png';
import { DarkModeContext } from '../../../context/dark.context';
import { Pin, Image as ImageIcon, Ban } from 'lucide-react';
import { toast } from 'react-toastify';

const ChatsDialog = () => {
	const [openChatsDialog, setOpenChatsDialog] = useState(false);
	const { chatId } = useContext(MessageContext);
	const { currentUser } = useSelector(selectCurrentUser);
	const { chats } = useSelector(selectChats);
	const { blocked } = useSelector(friendSelector);
	const { setOpenMediaDialog } = useContext(DialogContext);
	const { isDark } = useContext(DarkModeContext);
	const dispatch = useDispatch();

	const [isUserBlocked, setIsUserBlocked] = useState(false);
	const [isUserBlockOther, setIsUserBlockOther] = useState(false);
	const [pinBusy, setPinBusy] = useState(false);

	const menuRef = useRef(null);

	const currentChat = chats?.find((c) => c.chatId === chatId);
	const isPinned = Boolean(currentChat?.isPinned);

	useEffect(() => {
		if (blocked && chatId) {
			const data = blocked[chatId];
			if (data) {
				setIsUserBlocked(true);
				if (data.blockedBy === currentUser.id)
					setIsUserBlockOther(true);
			} else {
				setIsUserBlocked(false);
				setIsUserBlockOther(false);
			}
		}
	}, [blocked, chatId, currentUser.id]);

	useEffect(() => {
		const handleClickOutside = (e) => {
			if (menuRef.current && !menuRef.current.contains(e.target)) {
				setOpenChatsDialog(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	const handleBlockUser = async () => {
		try {
			if (isUserBlocked && isUserBlockOther) {
				await friendService.unblockUser(chatId);
			} else {
				await friendService.blockUser(chatId);
			}
			dispatch(getInitialData(currentUser.id));
			setOpenChatsDialog(false);
		} catch (error) {
			console.error('Error toggling block status:', error);
			toast.error('Could not update block status');
		}
	};

	const handleTogglePin = async () => {
		if (!chatId || pinBusy) return;
		setPinBusy(true);
		try {
			if (isPinned) {
				await unpinChat(chatId);
				toast.success('Chat unpinned');
			} else {
				await pinChat(chatId);
				toast.success('Chat pinned');
			}
			dispatch(fetchChats(currentUser.id));
			setOpenChatsDialog(false);
		} catch {
			toast.error('Could not update pin');
		} finally {
			setPinBusy(false);
		}
	};

	return (
		<div className="relative" ref={menuRef}>
			{openChatsDialog && (
				<div className="absolute top-10 right-0 z-40 min-w-[180px] bg-secondary border border-black/10 rounded-xl shadow-lg py-1.5 text-black text-left">
					<ul className="flex flex-col">
						<li>
							<button
								type="button"
								className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-black/5 text-left disabled:opacity-50"
								onClick={handleTogglePin}
								disabled={pinBusy || !chatId}
							>
								<Pin
									size={15}
									className={isPinned ? 'text-primary' : ''}
									fill={isPinned ? 'currentColor' : 'none'}
								/>
								{isPinned ? 'Unpin chat' : 'Pin chat'}
							</button>
						</li>
						<li>
							<button
								type="button"
								className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-black/5 text-left"
								onClick={() => {
									setOpenMediaDialog(true);
									setOpenChatsDialog(false);
								}}
							>
								<ImageIcon size={15} />
								Media
							</button>
						</li>
						{(isUserBlocked && isUserBlockOther) || !isUserBlocked ? (
							<li>
								<button
									type="button"
									className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-red-500/10 text-red-600 text-left"
									onClick={handleBlockUser}
								>
									<Ban size={15} />
									{isUserBlocked && isUserBlockOther
										? 'Unblock'
										: 'Block'}
								</button>
							</li>
						) : null}
					</ul>
				</div>
			)}

			<button
				type="button"
				className="p-2 rounded-lg hover:bg-black/5"
				onClick={() => setOpenChatsDialog(!openChatsDialog)}
				aria-label="Chat options"
				aria-expanded={openChatsDialog}
			>
				<img
					src={isDark ? dots1 : dots2}
					alt=""
					className="w-5 h-5"
				/>
			</button>
		</div>
	);
};

export default ChatsDialog;
