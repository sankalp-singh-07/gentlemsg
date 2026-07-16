import { useSelector, useDispatch } from 'react-redux';
import { friendSelector } from '../../store/friends/friends.selector';
import { useNavigate } from 'react-router-dom';
import { useContext, useState } from 'react';
import { DialogContext } from '../../context/dialog.context';
import { MessageContext } from '../../context/message.context';
import { selectCurrentUser } from '../../store/user/user.selector';
import { createChat } from '@/services/chatService';
import { unfriendUser } from '../../store/thunks/thunks';
import { toast } from 'react-toastify';
import { Avatar, EmptyState, Button } from '@/shared/ui';
import { formatLastSeen } from '@/shared/lib/messageDisplay';

const FriendsList = () => {
	const { friends } = useSelector(friendSelector);
	const { currentUser } = useSelector(selectCurrentUser);
	const [openingId, setOpeningId] = useState(null);
	const [removingId, setRemovingId] = useState(null);
	const dispatch = useDispatch();

	const navigate = useNavigate();
	const { setOpenFriendsDialog } = useContext(DialogContext);
	const { setChatId } = useContext(MessageContext);

	const handleOpenChat = async (friend) => {
		if (!currentUser?.id || !friend?.id || openingId) return;

		setOpeningId(friend.id);
		try {
			const chat = await createChat(friend.id);
			const chatId = chat.id;
			if (!chatId) throw new Error('No chat id returned');
			setChatId(chatId);
			if (window.innerWidth <= 600) navigate('/chat');
			setOpenFriendsDialog(false);
		} catch (error) {
			console.error('Failed to open chat:', error);
			toast.error('Could not open chat. Please try again.');
		} finally {
			setOpeningId(null);
		}
	};

	const handleUnfriend = async (friend) => {
		if (!window.confirm(`Remove ${friend.name} from friends?`)) return;
		setRemovingId(friend.id);
		try {
			await dispatch(unfriendUser({ friendId: friend.id })).unwrap();
			toast.info(`${friend.name} removed`);
		} catch {
			toast.error('Could not remove friend');
		} finally {
			setRemovingId(null);
		}
	};

	if (!friends || friends.length === 0) {
		return (
			<EmptyState
				title="No friends yet"
				description="Search for users and send a friend request to get started."
			/>
		);
	}

	return (
		<div className="grid gap-3 grid-cols-1 md:grid-cols-2 mx-4 my-4 overflow-scroll scrollbar-hide max-h-[50vh] pb-12">
			{friends.map((friend, index) => (
				<div
					key={friend.id || index}
					className="flex bg-quatery p-4 rounded-xl shadow-sm items-center justify-between gap-2"
				>
					<div className="flex items-center gap-3 min-w-0">
						<div className="relative shrink-0">
							<Avatar
								src={friend.photoURL}
								alt={friend.name || 'Friend'}
								size={48}
							/>
							{friend.isOnline && (
								<span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-quatery rounded-full" />
							)}
						</div>
						<div className="min-w-0">
							<p className="font-medium text-black truncate">
								{friend.name}
							</p>
							{friend.userName && (
								<p className="text-xs text-black/50 truncate">
									@{friend.userName}
								</p>
							)}
							<p className="text-[11px] text-black/40">
								{formatLastSeen(friend.lastActive, friend.isOnline)}
							</p>
						</div>
					</div>
					<div className="flex flex-col gap-1 shrink-0">
						<Button
							size="sm"
							onClick={() => handleOpenChat(friend)}
							disabled={openingId === friend.id}
							loading={openingId === friend.id}
						>
							Message
						</Button>
						<Button
							size="sm"
							variant="ghost"
							loading={removingId === friend.id}
							onClick={() => handleUnfriend(friend)}
						>
							Remove
						</Button>
					</div>
				</div>
			))}
		</div>
	);
};

export default FriendsList;
