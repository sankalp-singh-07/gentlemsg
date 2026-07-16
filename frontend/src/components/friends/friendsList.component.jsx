import { useSelector } from 'react-redux';
import { friendSelector } from '../../store/friends/friends.selector';
import { useNavigate } from 'react-router-dom';
import { useContext, useState } from 'react';
import { DialogContext } from '../../context/dialog.context';
import { MessageContext } from '../../context/message.context';
import { selectCurrentUser } from '../../store/user/user.selector';
import { createChat } from '../../services/chatService';
import { toast } from 'react-toastify';

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
			// Always use backend get-or-create so chatId is the real UUID
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
		return <p className="text-center p-4 text-gray-500">No friends yet</p>;
	}

	return (
		<div className="grid gap-4 grid-cols-1 md:grid-cols-2 mx-4 my-4 overflow-scroll scrollbar-hide">
			{friends.map((friend, index) => (
				<div
					key={friend.id || index}
					className="flex bg-quatery p-4 rounded shadow-md items-center justify-between"
				>
					<div className="flex items-center gap-2 md:gap-3">
						<img
							src={friend.photoURL}
							alt={friend.name || 'Friend'}
							referrerPolicy="no-referrer"
							className="w-8 h-8 rounded-full md:w-12 md:h-12 object-cover"
						/>
						<h1 className="text-sm text-center font-medium min-w-fit lg:text-base text-black">
							{friend.name}
						</h1>
					</div>
					<div>
						<button
							className="bg-primary px-2 py-1 lg:text-base text-sm rounded text-white disabled:opacity-50"
							onClick={() => handleOpenChat(friend)}
							disabled={openingId === friend.id}
						>
							{openingId === friend.id ? 'Opening…' : 'Message'}
						</button>
					</div>
				</div>
			))}
		</div>
	);
};

export default FriendsList;
