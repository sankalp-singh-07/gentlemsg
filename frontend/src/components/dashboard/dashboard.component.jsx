import Sidebar from '../sidebar/sidebar.component';
import Chat from '../chat/chat.component';
import GroupChat from '../groups/groupChat.component';
import StartChat from '../startChat/startChat.component';
import { useContext, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { MessageContext } from '../../context/message.context';
import { selectChats } from '../../store/chats/chats.selector';

import './dashboard.css';

const Dashboard = () => {
	const { chatId, groupId, clearConversation } = useContext(MessageContext);
	const { chats, loading } = useSelector(selectChats);

	// Drop stale chatId from localStorage when it isn't in the user's list
	// (e.g. new account, deleted chat, switched user) so we show StartChat.
	useEffect(() => {
		if (loading) return;
		if (!chatId) return;
		const exists = (chats || []).some((c) => c.chatId === chatId);
		if (!exists) {
			clearConversation();
		}
	}, [loading, chats, chatId, clearConversation]);

	let main = <StartChat />;
	if (groupId) main = <GroupChat inMobile="hidden" />;
	else if (chatId) main = <Chat inMobile="hidden" />;

	return (
		<div className="dashboard">
			<Sidebar />
			<div className="dashboard-split" />
			{main}
		</div>
	);
};

export default Dashboard;
