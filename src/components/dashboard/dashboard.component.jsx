import Sidebar from "../sidebar/sidebar.component";
import Chat from "../chat/chat.component";

import "./dashboard.css";

const Dashboard = () => {
  return (
    <div className="dashboard">
      <Sidebar />
      <div className="h-full w-1.5 bg-[#B8D9FF]"></div>
      <Chat inMobile="hidden" />
    </div>
  );
};

export default Dashboard;
