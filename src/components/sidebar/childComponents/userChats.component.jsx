import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectChats } from '../../../store/chats/chats.selector';
import { fetchChats } from '../../../store/chats/chats.reducer';
import { selectCurrentUser } from '../../../store/user/user.selector';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../utils/firebase';
import { useContext } from 'react';
import { MessageContext } from '../../../context/message.context';
import { decryptMessage, generateKey } from '../../../utils/encryption';

const UserChats = () => {
	const { chats, loading, error } = useSelector(selectChats);
	const { currentUser } = useSelector(selectCurrentUser);

	const [userData, setUserData] = useState([]);

	const userId = currentUser.id;

	const dispatch = useDispatch();

	const { setChatId } = useContext(MessageContext);

	useEffect(() => {
		dispatch(fetchChats(userId));
	}, [dispatch, userId]);

	const navigate = useNavigate();

	const handleClick = (chatId) => {
		const currentWidth = window.innerWidth;

		setChatId(chatId);

		if (currentWidth <= 600) {
			navigate('/chat');
		}
	};

	useEffect(() => {
		const fetchData = async (userId) => {
			const userRef = doc(db, 'users', userId);
			const userSnap = await getDoc(userRef);
			if (userSnap.exists()) {
				return { id: userId, ...userSnap.data() };
			}
			return null;
		};

		const fetchUsersData = async () => {
			const userDataArray = await Promise.all(
				chats.map(async (chat) => {
					const otherUserId =
						chat.receiverId === userId
							? chat?.senderId
							: chat.receiverId;
					return await fetchData(otherUserId);
				})
			);
			setUserData(userDataArray.filter((user) => user !== null));
		};

		if (chats.length) {
			fetchUsersData();
		}
	}, [chats, userId]);

	const getDate = (timeStamp) => {
		const date = new Date(timeStamp);
		const options = { day: 'numeric', month: 'short' };
		return new Intl.DateTimeFormat('en-US', options).format(date);
	};

	const showLatestMessage = (message, chatId, type) => {
		const userIds = chatId.split('-');
		let displayMessage = '';

		const encryptionKey = generateKey(userIds[0], userIds[1]);

		if (type === 'text') {
			const decryptedMessage = decryptMessage(message, encryptionKey);
			if (!decryptedMessage) {
				console.error(`Failed to decrypt message: ${message}`);
				displayMessage = 'Error decrypting message';
			} else {
				displayMessage =
					decryptedMessage.length > 17
						? `${decryptedMessage.slice(0, 17)}...`
						: decryptedMessage;
			}
		} else if (type === 'image') {
			displayMessage = '[Image]';
		} else if (type === 'document') {
			displayMessage = '[Document]';
		} else if (type === 'video') {
			displayMessage = '[Video]';
		} else {
			displayMessage = 'Start Conversation';
		}

		return displayMessage;
	};

	const sortedChats = [...chats].sort((a, b) => {
		return new Date(b.sentAt) - new Date(a.sentAt);
	});

	if (loading) return <h1>Loading...</h1>;
	if (error) return <h1>{error}</h1>;

	return (
		<>
			{sortedChats.map((chat) => {
				const otherUserId =
					chat.receiverId === userId
						? chat?.senderId
						: chat.receiverId;
				const user = userData.find((user) => user.id === otherUserId);

				return (
					<div
						className="py-2"
						onClick={() => handleClick(chat.chatId)}
						key={chat.chatId}
					>
						<div
							className={`userChat hover:bg-tertiary px-2 py-2 rounded-md ${
								chat.isSeen ? 'bg-tertiary' : 'bg-sky-200'
							}`}
						>
							<div className="userChatImg">
								{user ? (
									<img
										src={user.photoURL}
										alt="..."
										className="avatar"
									/>
								) : (
									<h1>?</h1>
								)}
							</div>
							<div className="userChatInfo">
								<div className="userName">
									{user ? <h1>{user.name}</h1> : <h1>...</h1>}
								</div>
								<div className="userMessage">
									<p>
										{user
											? showLatestMessage(
													chat.lastMessage,
													chat.chatId,
													chat.type
											  )
											: '...'}
									</p>
								</div>
							</div>
							<div className="userChatDetails">
								<div className="text-xs">
									{getDate(chat.sentAt)}
								</div>
								{/* <div className="userChatNotif">5</div> */}
							</div>
						</div>
					</div>
				);
			})}
		</>
	);
};

export default UserChats;
