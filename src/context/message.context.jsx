import { createContext, useState } from 'react';

export const MessageContext = createContext({
	messages: [],
	chatId: '',
	setMessages: () => {},
	setChatId: () => {},
});

export const MessageProvider = ({ children }) => {
	const [messages, setMessages] = useState([]);
	const [chatId, setChatId] = useState('');

	return (
		<MessageContext.Provider
			value={{ messages, setMessages, chatId, setChatId }}
		>
			{children}
		</MessageContext.Provider>
	);
};
