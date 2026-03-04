import Sidebar from '../sidebar/sidebar.component';
import Chat from '../chat/chat.component';
import StartChat from '../startChat/startChat.component';
import { useContext } from 'react';
import { MessageContext } from '../../context/message.context';

import './dashboard.css';

const Dashboard = () => {
	const { chatId } = useContext(MessageContext);

	return (
		<div className="dashboard">
			<Sidebar />
			<div className="h-full w-1.5 bg-[#B8D9FF]"></div>
			{chatId ? <Chat inMobile="hidden" /> : <StartChat />}
		</div>
	);
};

export default Dashboard;
