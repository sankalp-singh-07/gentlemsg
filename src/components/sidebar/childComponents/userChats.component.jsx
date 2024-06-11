import React from 'react';

const UserChats = () => {
	return (
		<div className="py-2">
			<div className="userChat">
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
