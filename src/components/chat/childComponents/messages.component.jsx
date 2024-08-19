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
		.filter((el) => el !== currentUser?.id)[0];

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

	const showDecryptedMessage = (message, chatId, type) => {
		const userIds = chatId.split('-');
		const encryptionKey = generateKey(userIds[0], userIds[1]);

		if (type === 'text') {
			const decryptedMessage = decryptMessage(message, encryptionKey);
			return decryptedMessage || 'Failed to get message';
		} else if (
			type === 'image' ||
			type === 'document' ||
			type === 'video'
		) {
			return message.map((url) => [url, type]);
		}
	};

	return (
		<>
			{messagesArr.map((message, index) => {
				const isOwn = message.senderId === currentUser.id;
				const decryptedContent = showDecryptedMessage(
					message.message,
					chatId,
					message.type
				);

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
							{message.type === 'text' ? (
								<span className="textContent text-left">
									{decryptedContent}
								</span>
							) : (
								decryptedContent.map((item, i) => (
									<div key={i} className="justify-items-end">
										{item[1] === 'image' ? (
											<img
												src={item[0]}
												alt="media"
												className="w-6/12 h-50 m-auto hover:cursor-pointer"
												onClick={() =>
													window.open(item[0])
												}
											/>
										) : item[1] === 'document' ? (
											<div className="w-fit h-fit bg-primary rounded-md">
												<a
													href={item[0]}
													target="_blank"
													rel="noopener noreferrer"
													className="text-blue-600 underline"
												>
													<p className="text-tertiary px-2 py-3">
														View Document
													</p>
												</a>
											</div>
										) : (
											<video
												controls
												className="w-10/12 h-80 m-auto"
											>
												<source src={item[0]} />
											</video>
										)}
									</div>
								))
							)}
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
