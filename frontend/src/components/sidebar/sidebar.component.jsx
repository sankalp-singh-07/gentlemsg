import './sidebar.css';
import UserChats from './childComponents/userChats.component';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../store/user/user.selector';
import DropDownSetting from '../dropdown/dropdown.setting';
import SearchFriends from '../friends/searchFriends.component';
import GlobalSearch from '../search/globalSearch.component';
import { useRef, useState } from 'react';
import ProfilePicture from '../profile/profilePicture.component';
import DarkMode from '../darkMode/darkMode.component';
import { Avatar } from '@/shared/ui';
import { UserPlus } from 'lucide-react';

const Sidebar = () => {
	const { currentUser } = useSelector(selectCurrentUser);
	const [searchFriends, setSearchFriends] = useState(false);
	const imageUploadRef = useRef(null);
	const [file, setFile] = useState(null);

	const handleUpload = () => {
		imageUploadRef.current?.click();
	};

	const handleImageUpload = (e) => {
		const f = e.target.files?.[0];
		if (f) setFile(f);
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
				<div className="userActions flex items-center gap-2 px-2">
					<div className="flex-1 min-w-0">
						<GlobalSearch />
					</div>
					<button
						type="button"
						className="addUser shrink-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:opacity-90"
						onClick={() => setSearchFriends((v) => !v)}
						aria-label={searchFriends ? 'Close add friends' : 'Add friends'}
						title="Add friends"
					>
						{searchFriends ? '−' : <UserPlus size={18} />}
					</button>
				</div>
				<div className="userChats scrollbar-hide">
					<UserChats />
				</div>
			</div>
			<div className="border-b-4 border-[#B8D9FF]"></div>
			<div className="end">
				<div className="userProfile">
					<button
						type="button"
						className="w-11 h-11 rounded-full mr-2 cursor-pointer hover:opacity-80"
						onClick={handleUpload}
					>
						<Avatar
							src={currentUser?.photoURL}
							alt={currentUser?.name || 'You'}
							size={44}
						/>
						<input
							type="file"
							className="hidden"
							ref={imageUploadRef}
							onChange={handleImageUpload}
							accept="image/*"
						/>
					</button>
					<div className="userProfileInfo min-w-0">
						<h1 className="text-base font-medium text-black truncate">
							{currentUser?.name}
						</h1>
						{currentUser?.userName && (
							<p className="text-xs text-black/50 truncate">
								@{currentUser.userName}
							</p>
						)}
					</div>
				</div>
				<div className="setting">
					<DropDownSetting />
				</div>
			</div>
			{searchFriends && (
				<SearchFriends onClose={() => setSearchFriends(false)} />
			)}
			<ProfilePicture file={file} />
		</div>
	);
};

export default Sidebar;
