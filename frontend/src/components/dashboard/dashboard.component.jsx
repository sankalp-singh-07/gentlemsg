import Sidebar from '../sidebar/sidebar.component';
import Chat from '../chat/chat.component';
import GroupChat from '../groups/groupChat.component';
import StartChat from '../startChat/startChat.component';
import { useContext } from 'react';
import { MessageContext } from '../../context/message.context';

import './dashboard.css';

const Dashboard = () => {
	const { chatId, groupId } = useContext(MessageContext);

	let main = <StartChat />;
	if (groupId) main = <GroupChat inMobile="hidden" />;
	else if (chatId) main = <Chat inMobile="hidden" />;

	return (
		<div className="dashboard">
			<Sidebar />
			<div className="h-full w-1.5 bg-[#B8D9FF]"></div>
			{main}
		</div>
	);
};

export default Dashboard;
