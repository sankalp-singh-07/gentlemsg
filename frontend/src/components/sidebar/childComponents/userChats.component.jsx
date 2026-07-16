import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectChats } from '../../../store/chats/chats.selector';
import { fetchChats } from '../../../store/chats/chats.reducer';
import { selectCurrentUser } from '../../../store/user/user.selector';
import { useContext } from 'react';
import { MessageContext } from '../../../context/message.context';
import { decryptMessage, generateKey } from '../../../utils/encryption';

const UserChats = () => {
	const { chats, loading, error } = useSelector(selectChats);
	const { currentUser } = useSelector(selectCurrentUser);
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

	const getDate = (timeStamp) => {
		if (!timeStamp) return '';
		const date = new Date(timeStamp);
		const options = { day: 'numeric', month: 'short' };
		return new Intl.DateTimeFormat('en-US', options).format(date);
	};

	const showLatestMessage = (message, receiverId, type) => {
		if (!message) return 'Start Conversation';

		if (type === 'text') {
			// Try to decrypt
			const encryptionKey = generateKey(userId, receiverId);
			const decryptedMessage = decryptMessage(message, encryptionKey);
			
			// If decryption fails, it's likely a legacy plaintext message, so fallback to raw
			const textToDisplay = decryptedMessage || message;
			
			return textToDisplay.length > 17
				? `${textToDisplay.slice(0, 17)}...`
				: textToDisplay;
		} else if (type === 'image') return '[Image]';
		else if (type === 'document') return '[Document]';
		else if (type === 'video') return '[Video]';
		else return 'Start Conversation';
	};

	const sortedChats = [...chats].sort((a, b) => {
		return new Date(b.sentAt) - new Date(a.sentAt);
	});

	if (loading) return <h1>Loading...</h1>;
	if (error) return <h1>{error}</h1>;

	return (
		<>
			{sortedChats.map((chat) => {
				// Backend already provides receiver data in the chat list
				return (
					<div
						className="py-2"
						onClick={() => handleClick(chat.chatId)}
						key={chat.chatId}
					>
						<div
							className={`userChat hover:bg-tertiaryHover px-2 py-2 rounded-md ${
								chat.isSeen ? 'bg-tertiary' : 'bg-sky-200'
							}`}
						>
							<div className="userChatImg">
								{chat.receiverPhotoURL ? (
									<img
										src={chat.receiverPhotoURL}
										alt="..."
										referrerPolicy="no-referrer"
										className="avatar"
									/>
								) : (
									<h1>?</h1>
								)}
							</div>
							<div className="userChatInfo">
								<div className="userName">
									<h1>{chat.receiverName || '...'}</h1>
								</div>
								<div className="userMessage">
									<p>
										{showLatestMessage(
											chat.lastMessage,
											chat.receiverId,
											chat.type
										)}
									</p>
								</div>
							</div>
							<div className="userChatDetails">
								<div className="text-xs">
									{getDate(chat.sentAt)}
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
