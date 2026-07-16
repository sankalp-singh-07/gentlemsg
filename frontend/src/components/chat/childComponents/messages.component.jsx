import { useContext, useEffect, useRef } from 'react';
import { MessageContext } from '../../../context/message.context';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../../store/user/user.selector';
import { decryptMessage, generateKey } from '../../../utils/encryption';

const Messages = ({ receiverImg, receiverId }) => {
	const { messages } = useContext(MessageContext);
	const messagesArr = messages.messages || [];

	const { currentUser } = useSelector(selectCurrentUser);

	const messagesEndRef = useRef(null);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messagesArr]);

	const getDate = (timeStamp) => {
		if (!timeStamp) return '';
		const date = new Date(timeStamp);
		const options = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
		return new Intl.DateTimeFormat('en-US', options).format(date);
	};

	const showDecryptedMessage = (message, type) => {
		let encryptionKey = null;
		if (receiverId && currentUser?.id) {
			encryptionKey = generateKey(currentUser.id, receiverId);
		}

		if (type === 'text') {
			// Support both encrypted legacy messages and plain text
			const decryptedMessage = decryptMessage(message, encryptionKey);
			return decryptedMessage || message;
		} else if (
			type === 'image' ||
			type === 'document' ||
			type === 'video'
		) {
			const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
			const urls = Array.isArray(message) ? message : [message];
			return urls.map((url) => {
				const fullUrl = url.startsWith('/uploads') ? `${API_URL}${url}` : url;
				return [fullUrl, type];
			});
		}
		return message;
	};

	if (!currentUser) return null;

	return (
		<>
			{messagesArr.map((message) => {
				const isOwn = message.senderId === currentUser.id;
				const decryptedContent = showDecryptedMessage(
					message.message,
					message.type
				);

				return (
					<div
						key={message.id}
						className={`message ${isOwn ? 'own' : ''}`}
					>
						{!isOwn && (
							<img
								src={receiverImg}
								alt=""
								className="w-8 h-8 m-3 rounded-full object-cover"
								referrerPolicy="no-referrer"
							/>
						)}
						<div className="texts">
							{message.type === 'text' ? (
								<span className="textContent text-left">
									{decryptedContent}
								</span>
							) : (
								Array.isArray(decryptedContent) &&
								decryptedContent.map((item, i) => (
									<div key={`${message.id}-${i}`} className="justify-items-end">
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
							<span className="flex self-end text-sm font-normal text-black">
								{getDate(message.sentAt)}
							</span>
						</div>
					</div>
				);
			})}
			<div ref={messagesEndRef} />
		</>
	);
};

export default Messages;
