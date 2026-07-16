import { createContext, useState } from 'react';

export const MessageContext = createContext({
	messages: [],
	chatId: '',
	setMessages: () => {},
	setChatId: () => {},
});

export const MessageProvider = ({ children }) => {
	const [messages, setMessages] = useState([]);
	const [chatId, setChatIdBase] = useState(() => {
		const cachedChatId = localStorage.getItem('gentlemsg_chatId');
		return cachedChatId || '';
	});

	const setChatId = (newChatId) => {
		setChatIdBase(newChatId);
		localStorage.setItem('gentlemsg_chatId', newChatId);
	};

	return (
		<MessageContext.Provider
			value={{ messages, setMessages, chatId, setChatId }}
		>
			{children}
		</MessageContext.Provider>
	);
};
