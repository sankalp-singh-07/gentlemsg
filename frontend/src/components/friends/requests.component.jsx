import { useDispatch, useSelector } from 'react-redux';
import { friendSelector } from '../../store/friends/friends.selector';
import { selectCurrentUser } from '../../store/user/user.selector';
import { acceptRequest, rejectRequest } from '../../store/thunks/thunks';
import * as chatService from '../../services/chatService';

const Requests = () => {
	const { requests } = useSelector(friendSelector);
	const { currentUser } = useSelector(selectCurrentUser);
	const dispatch = useDispatch();

	const handleAccept = async (senderId) => {
		dispatch(acceptRequest({ userId: currentUser.id, senderId }));
		// Create chat after accepting
		try {
			await chatService.createChat(senderId);
		} catch (error) {
			console.error('Error creating chat:', error);
		}
	};

	const handleReject = (senderId) => {
		dispatch(rejectRequest({ userId: currentUser.id, senderId }));
	};

	if (!requests || requests.length === 0) {
		return <p className="text-center p-4 text-gray-500">No pending requests</p>;
	}

	return (
		<div className="grid gap-4 grid-cols-1 md:grid-cols-2 mx-4 my-4 overflow-scroll scrollbar-hide">
			{requests.map((req) => {
				// For received requests (current user is the receiver)
				if (currentUser.id === req.receiverId) {
					return (
						<div
							key={req.senderId}
							className="bg-gray-100 p-4 rounded shadow-md flex flex-col items-center gap-2 justify-between"
						>
							<div className="flex flex-col items-center gap-2">
								<img
									src={req.senderPhotoURL}
									alt="..."
									className="sm:w-12 sm:h-12 rounded-full w-8 h-8"
								/>
								<h1 className="text-sm text-center font-medium min-w-fit lg:text-base">
									{req.senderName}
								</h1>
							</div>
							<div className="flex gap-2">
								<button
									onClick={() => handleAccept(req.senderId)}
									className="bg-blue-500 text-white sm:px-2 sm:py-2 rounded hover:bg-blue-700 py-2 px-4"
								>
									<span className="md:text-sm text-xs font-semibold text-center">
										Accept
									</span>
								</button>
								<button
									onClick={() => handleReject(req.senderId)}
									className="bg-red-500 text-white sm:px-2 sm:py-2 rounded hover:bg-red-700 py-2 px-4"
								>
									<span className="md:text-sm text-xs font-semibold text-center">
										Reject
									</span>
								</button>
							</div>
						</div>
					);
				}
				// For sent requests (current user is the sender)
				if (currentUser.id === req.senderId) {
					return (
						<div
							key={req.receiverId}
							className="flex bg-quatery p-4 rounded shadow-md items-center justify-between"
						>
							<div className="flex items-center gap-3">
								<img
									src={req.receiverPhotoURL}
									alt="..."
									className="w-12 h-12 rounded-full"
								/>
								<h1 className="text-sm text-center font-medium min-w-fit lg:text-base">
									{req.receiverName}
								</h1>
							</div>
							<div className="text-end md:text-sm text-xs">
								{req.status}
							</div>
						</div>
					);
				}
				return null;
			})}
		</div>
	);
};

export default Requests;
