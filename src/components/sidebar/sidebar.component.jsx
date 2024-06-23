import React from 'react';
import './sidebar.css';
import UserChats from './childComponents/userChats.component';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../store/user/user.selector';

const Sidebar = () => {
	const { currentUser } = useSelector(selectCurrentUser);

	return (
		<div className="sidebar">
			<div className="top">
				<div className="title">
					<h1>
						Gentle
						<span className="text-primary text-3xl">.</span>
						MSG
					</h1>
				</div>
				<div className="darkContainer">
					<button className="darkEl">Dark</button>
				</div>
			</div>
			<div className="mid">
				<div className="userActions">
					<div className="search">
						<input
							type="text"
							placeholder="Search Users"
							className="searchBar"
						/>
						<div className="underline"></div>
					</div>
					<div className="addNewUser ml-2">
						<button className="addUser">
							<span className="font-bold text-3xl absolute top-0 bottom-0 right-0 left-0">
								+
							</span>
						</button>
					</div>
				</div>
				<div className="userChats scrollbar-hide">
					<UserChats />
					<UserChats />
					<UserChats />
					<UserChats />
					<UserChats />
					<UserChats />
					<UserChats />
					<UserChats />
					<UserChats />
					<UserChats />
				</div>
			</div>
			<div className="border-b-4 border-[#B8D9FF]"></div>
			<div className="end">
				<div className="userProfile">
					<div className="userProfileImg">
						<img
							src={currentUser.photoURL}
							alt="user"
							className="avatar"
						/>
					</div>
					<div className="userProfileInfo">
						<h1 className="text-base font-medium">
							{currentUser.name}
						</h1>
					</div>
				</div>
				<div className="setting">
					<img
						src="src\assets\gear.png"
						alt="settings"
						className="settingsImg"
					/>
				</div>
			</div>
		</div>
	);
};

export default Sidebar;
