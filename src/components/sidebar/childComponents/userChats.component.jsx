import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const UserChats = () => {
	const navigate = useNavigate();

	const handleClick = () => {
		const currentWidth = window.innerWidth;

		if (currentWidth <= 600) {
			navigate('/chat');
		}
	};

	return (
		<div className="py-2" onClick={handleClick}>
			<div className="userChat hover:bg-tertiary px-2 py-2 rounded-md">
				<div className="userChatImg">
					<img
						src="src\assets\profile.jpg"
						alt="user"
						className="avatar"
					/>
				</div>
				<div className="userChatInfo">
					<div className="userName">
						<h1>John Doe</h1>
					</div>
					<div className="userMessage">
						<p>Hey! How are you?</p>
					</div>
				</div>
				<div className="userChatDetails">
					<div className="userChatTime">12:23</div>
					<div className="userChatNotif">5</div>
				</div>
			</div>
		</div>
	);
};

export default UserChats;
