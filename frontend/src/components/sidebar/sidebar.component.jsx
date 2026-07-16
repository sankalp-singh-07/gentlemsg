import './sidebar.css';
import UserChats from './childComponents/userChats.component';
import GroupList from '../groups/groupList.component';
import CreateGroup from '../groups/createGroup.component';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../store/user/user.selector';
import DropDownSetting from '../dropdown/dropdown.setting';
import SearchFriends from '../friends/searchFriends.component';
import GlobalSearch from '../search/globalSearch.component';
import { useRef, useState } from 'react';
import ProfilePicture from '../profile/profilePicture.component';
import DarkMode from '../darkMode/darkMode.component';
import { Avatar } from '@/shared/ui';
import { UserPlus, Users } from 'lucide-react';

const Sidebar = () => {
	const { currentUser } = useSelector(selectCurrentUser);
	const [searchFriends, setSearchFriends] = useState(false);
	const [createGroupOpen, setCreateGroupOpen] = useState(false);
	const [groupRefresh, setGroupRefresh] = useState(0);
	const [tab, setTab] = useState('chats'); // chats | groups
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
						aria-label="Add friends"
						title="Add friends"
					>
						{searchFriends ? '−' : <UserPlus size={18} />}
					</button>
				</div>

				{/* Chats / Groups tabs */}
				<div className="flex gap-1 px-2 mt-2 mb-1">
					<button
						type="button"
						className={`flex-1 text-xs py-1.5 rounded-md font-medium ${
							tab === 'chats'
								? 'bg-primary text-white'
								: 'bg-tertiary text-black/70'
						}`}
						onClick={() => setTab('chats')}
					>
						Chats
					</button>
					<button
						type="button"
						className={`flex-1 text-xs py-1.5 rounded-md font-medium ${
							tab === 'groups'
								? 'bg-primary text-white'
								: 'bg-tertiary text-black/70'
						}`}
						onClick={() => setTab('groups')}
					>
						Groups
					</button>
				</div>

				{tab === 'groups' && (
					<div className="px-2 mb-2">
						<button
							type="button"
							className="w-full text-sm font-semibold flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white shadow-md hover:opacity-90 active:scale-[0.98] transition border border-primary"
							onClick={() => setCreateGroupOpen(true)}
						>
							<Users size={16} strokeWidth={2.25} />
							New group
						</button>
					</div>
				)}

				<div className="userChats scrollbar-hide">
					{tab === 'chats' ? (
						<UserChats />
					) : (
						<GroupList refreshKey={groupRefresh} />
					)}
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
					<div className="userProfileInfo min-w-0 flex-1 text-left">
						<p className="text-sm sm:text-base font-semibold text-black truncate text-left leading-tight">
							{currentUser?.name}
						</p>
						{currentUser?.userName && (
							<p className="text-xs text-black/55 truncate text-left leading-tight mt-0.5">
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
			<CreateGroup
				open={createGroupOpen}
				onClose={() => setCreateGroupOpen(false)}
				onCreated={() => setGroupRefresh((k) => k + 1)}
			/>
			<ProfilePicture file={file} />
		</div>
	);
};

export default Sidebar;
