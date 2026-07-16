import { createContext, useState, useCallback } from 'react';

export const MessageContext = createContext({
	messages: { messages: [] },
	chatId: '',
	groupId: '',
	setMessages: () => {},
	setChatId: () => {},
	setGroupId: () => {},
	clearConversation: () => {},
});

export const MessageProvider = ({ children }) => {
	const [messages, setMessages] = useState({ messages: [] });
	const [chatId, setChatIdBase] = useState(
		() => localStorage.getItem('gentlemsg_chatId') || ''
	);
	const [groupId, setGroupIdBase] = useState(
		() => localStorage.getItem('gentlemsg_groupId') || ''
	);

	const setChatId = useCallback((id) => {
		setChatIdBase(id || '');
		if (id) {
			localStorage.setItem('gentlemsg_chatId', id);
			// exclusive conversation mode
			setGroupIdBase('');
			localStorage.removeItem('gentlemsg_groupId');
			setMessages({ messages: [] });
		} else {
			localStorage.removeItem('gentlemsg_chatId');
		}
	}, []);

	const setGroupId = useCallback((id) => {
		setGroupIdBase(id || '');
		if (id) {
			localStorage.setItem('gentlemsg_groupId', id);
			setChatIdBase('');
			localStorage.removeItem('gentlemsg_chatId');
			setMessages({ messages: [] });
		} else {
			localStorage.removeItem('gentlemsg_groupId');
		}
	}, []);

	const clearConversation = useCallback(() => {
		setChatIdBase('');
		setGroupIdBase('');
		localStorage.removeItem('gentlemsg_chatId');
		localStorage.removeItem('gentlemsg_groupId');
		setMessages({ messages: [] });
	}, []);

	return (
		<MessageContext.Provider
			value={{
				messages,
				setMessages,
				chatId,
				groupId,
				setChatId,
				setGroupId,
				clearConversation,
			}}
		>
			{children}
		</MessageContext.Provider>
	);
};
