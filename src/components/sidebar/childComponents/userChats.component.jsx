import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectChats } from '../../../store/chats/chats.selector';
import { useDispatch } from 'react-redux';
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
		for (let i = 0; i < chats.length; i++) {
			const receiverId = chats[i].receiverId;

			const fetchData = async (receiverId) => {
				const receiverRef = doc(db, 'users', receiverId);
				const receiverSnap = await getDoc(receiverRef);

				if (receiverSnap.exists()) {
					const receiver = receiverSnap.data();
					return { id: receiverId, ...receiver };
				}
			};

			const fetchUsersData = async () => {
				const userDataArray = await Promise.all(
					chats.map((chat) => fetchData(chat.receiverId))
				);
				setUserData(userDataArray);
			};

			if (chats.length) {
				fetchUsersData();
			}
		}
	}, [chats, userId]);

	const getDate = (timeStamp) => {
		const date = new Date(timeStamp);
		const options = { day: 'numeric', month: 'short' };
		return new Intl.DateTimeFormat('en-US', options).format(date);
	};

	const showLatestMessage = (message, chatId) => {
		const userIds = chatId.split('-');
		if (message === 'Start Conversation') {
			return message;
		}

		const encryptionKey = generateKey(userIds[0], userIds[1]);
		const decryptedMessage = decryptMessage(message, encryptionKey);
		if (!decryptedMessage) {
			console.error(`Failed to decrypt message: ${message}`);
			return 'Error decrypting message';
		}
		return decryptedMessage.length > 17
			? `${decryptedMessage.slice(0, 17)}...`
			: decryptedMessage;
	};

	if (loading) return <h1>Loading...</h1>;
	if (error) return <h1>{error}</h1>;

	return (
		<>
			{chats.map((chat, index) => {
				const user = userData.find(
					(user) => user.id === chat.receiverId
				);

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
													chat.chatId
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
