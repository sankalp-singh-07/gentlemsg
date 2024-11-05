import './sidebar.css';
import UserChats from './childComponents/userChats.component';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../store/user/user.selector';
import DropDownSetting from '../dropdown/dropdown.setting';
import SearchFriends from '../friends/searchFriends.component';
import { useRef, useState } from 'react';
import ProfilePicture from '../profile/profilePicture.component';
import DarkMode from '../darkMode/darkMode.component';

const Sidebar = () => {
	const { currentUser } = useSelector(selectCurrentUser);
	const [searchFriends, setSearchFriends] = useState(false);
	const imageUploadRef = useRef(null);
	const [file, setFile] = useState(null);

	const handleUpload = () => {
		imageUploadRef.current.click();
	};

	const handleImageUpload = (e) => {
		const file = e.target.files[0];
		setFile(file);
	};

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
					<DarkMode />
				</div>
			</div>
			<div className="mid">
				<div className="userActions">
					{/* <div className="searchEl">
						<input
							type="text"
							placeholder="Search Users"
							className="searchBarEl"
						/>
						<div className="underline"></div>
					</div> */}
					<div className="addNewUser ml-2">
						<button
							className="addUser"
							onClick={() => setSearchFriends(!searchFriends)}
						>
							<span className="font-bold text-3xl absolute top-0 bottom-0 right-0 left-0">
								{searchFriends ? '-' : '+'}
							</span>
						</button>
					</div>
				</div>
				<div className="userChats scrollbar-hide">
					<UserChats />
				</div>
			</div>
			<div className="border-b-4 border-[#B8D9FF]"></div>
			<div className="end">
				<div className="userProfile">
					<div className="w-11 h-11 rounded-full mr-2 cursor-pointer hover:opacity-50">
						<img
							src={currentUser.photoURL}
							alt="..."
							className="w-full h-full rounded-full object-cover"
							onClick={handleUpload}
						/>
						<input
							type="file"
							className="hidden"
							ref={imageUploadRef}
							onChange={(e) => handleImageUpload(e)}
						/>
					</div>
					<div className="userProfileInfo">
						<h1 className="text-base font-medium">
							{currentUser.name}
						</h1>
					</div>
				</div>
				<div className="setting">
					<DropDownSetting />
				</div>
			</div>
			{searchFriends && <SearchFriends />}
			<ProfilePicture file={file} />
		</div>
	);
};

export default Sidebar;
