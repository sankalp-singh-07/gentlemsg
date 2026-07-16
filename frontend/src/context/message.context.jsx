import { createContext, useState, useCallback, useRef } from 'react';

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

	// Track latest ids so setChatId/setGroupId can no-op on same selection
	// (re-clicking an open chat used to clear messages without re-fetching).
	const chatIdRef = useRef(chatId);
	const groupIdRef = useRef(groupId);
	chatIdRef.current = chatId;
	groupIdRef.current = groupId;

	const setChatId = useCallback((id) => {
		const next = id || '';
		if (chatIdRef.current === next) return;
		chatIdRef.current = next;
		setChatIdBase(next);
		if (next) {
			localStorage.setItem('gentlemsg_chatId', next);
			// exclusive conversation mode
			groupIdRef.current = '';
			setGroupIdBase('');
			localStorage.removeItem('gentlemsg_groupId');
			setMessages({ messages: [] });
		} else {
			localStorage.removeItem('gentlemsg_chatId');
		}
	}, []);

	const setGroupId = useCallback((id) => {
		const next = id || '';
		if (groupIdRef.current === next) return;
		groupIdRef.current = next;
		setGroupIdBase(next);
		if (next) {
			localStorage.setItem('gentlemsg_groupId', next);
			chatIdRef.current = '';
			setChatIdBase('');
			localStorage.removeItem('gentlemsg_chatId');
			setMessages({ messages: [] });
		} else {
			localStorage.removeItem('gentlemsg_groupId');
		}
	}, []);

	const clearConversation = useCallback(() => {
		chatIdRef.current = '';
		groupIdRef.current = '';
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
