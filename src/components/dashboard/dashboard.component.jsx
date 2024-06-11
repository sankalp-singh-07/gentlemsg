import Sidebar from '../sidebar/sidebar.component';
import Chat from '../chat/chat.component';

import './dashboard.css';

const Dashboard = () => {
	return (
		<div className="dashboard">
			<Sidebar />
			<div></div>
			<Chat />
		</div>
	);
};

export default Dashboard;
