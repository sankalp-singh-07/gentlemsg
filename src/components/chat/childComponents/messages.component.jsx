import { useContext, useEffect, useRef, useState } from 'react';
import { MessageContext } from '../../../context/message.context';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../../store/user/user.selector';
import { decryptMessage, generateKey } from '../../../utils/encryption';

const Messages = ({ receiverImg }) => {
	const { messages, chatId } = useContext(MessageContext);
	const messagesArr = messages.messages || [];

	const { currentUser } = useSelector(selectCurrentUser);
	const { receiverInfo, setReceiverInfo } = useState([]);
	const receiverId = chatId
		.split('-')
		.filter((el) => el !== currentUser.id)[0];

	// Scroll
	const messagesEndRef = useRef(null);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messagesArr]);

	// Helper functions
	const getDate = (timeStamp) => {
		const date = new Date(timeStamp);
		const options = { day: 'numeric', month: 'short' };
		return new Intl.DateTimeFormat('en-US', options).format(date);
	};

	const showDecryptedMessage = (message, chatId) => {
		const userIds = chatId.split('-');

		const encryptionKey = generateKey(userIds[0], userIds[1]);
		const decryptedMessage = decryptMessage(message, encryptionKey);
		if (!decryptedMessage) {
			console.error(`Failed to decrypt message: ${message}`);
			return 'Failed to get message';
		}
		return decryptedMessage;
	};

	return (
		<>
			{messagesArr.map((message, index) => {
				const isOwn = message.senderId === currentUser.id;
				return (
					<div
						key={index}
						className={`message ${isOwn ? 'own' : ''}`}
					>
						{!isOwn && (
							<img
								src={receiverImg}
								className="w-8 h-8 m-3 rounded-full"
							/>
						)}
						<div className="texts">
							<span className="textContent text-left">
								{showDecryptedMessage(message.message, chatId)}
							</span>
							<span className="flex self-end text-sm font-normal">
								{getDate(message.sentAt)}
							</span>
						</div>
						<div ref={messagesEndRef} />
					</div>
				);
			})}
		</>
	);
};

export default Messages;
