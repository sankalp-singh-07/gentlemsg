import { useSelector } from 'react-redux';
import { friendSelector } from '../../store/friends/friends.selector';
import { useNavigate } from 'react-router-dom';
import { useContext, useState } from 'react';
import { DialogContext } from '../../context/dialog.context';
import { MessageContext } from '../../context/message.context';
import { selectCurrentUser } from '../../store/user/user.selector';
import { createChat } from '@/services/chatService';
import { toast } from 'react-toastify';
import { Avatar, EmptyState, Button } from '@/shared/ui';

const FriendsList = () => {
	const { friends } = useSelector(friendSelector);
	const { currentUser } = useSelector(selectCurrentUser);
	const [openingId, setOpeningId] = useState(null);

	const navigate = useNavigate();
	const { setOpenFriendsDialog } = useContext(DialogContext);
	const { setChatId } = useContext(MessageContext);

	const handleOpenChat = async (friend) => {
		if (!currentUser?.id || !friend?.id || openingId) return;

		setOpeningId(friend.id);
		try {
			const chat = await createChat(friend.id);
			const chatId = chat.id;
			if (!chatId) {
				throw new Error('No chat id returned');
			}
			setChatId(chatId);
			if (window.innerWidth <= 600) {
				navigate('/chat');
			}
			setOpenFriendsDialog(false);
		} catch (error) {
			console.error('Failed to open chat:', error);
			toast.error('Could not open chat. Please try again.');
		} finally {
			setOpeningId(null);
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
		<div className="grid gap-4 grid-cols-1 md:grid-cols-2 mx-4 my-4 overflow-scroll scrollbar-hide">
			{friends.map((friend, index) => (
				<div
					key={friend.id || index}
					className="flex bg-quatery p-4 rounded shadow-md items-center justify-between"
				>
					<div className="flex items-center gap-2 md:gap-3 min-w-0">
						<Avatar
							src={friend.photoURL}
							alt={friend.name || 'Friend'}
							size={40}
							className="md:w-12 md:h-12"
						/>
						<h1 className="text-sm text-center font-medium min-w-fit lg:text-base text-black truncate">
							{friend.name}
						</h1>
					</div>
					<Button
						size="sm"
						onClick={() => handleOpenChat(friend)}
						disabled={openingId === friend.id}
						loading={openingId === friend.id}
					>
						Message
					</Button>
				</div>
			))}
		</div>
	);
};

export default FriendsList;
