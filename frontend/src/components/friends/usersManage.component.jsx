import React, { useContext, useState } from 'react';
import FriendsList from './friendsList.component';
import Requests from './requests.component';
import { DialogContext } from '../../context/dialog.context';
import { friendSelector } from '../../store/friends/friends.selector';
import { useSelector } from 'react-redux';

const UsersManagement = () => {
	const { setOpenFriendsDialog } = useContext(DialogContext);
	const { requests } = useSelector(friendSelector);
	const [activeSection, setActiveSection] = useState('friends');

	const incomingCount = (requests || []).filter(
		(r) => r.status === 'pending'
	).length;

	return (
		<div className="bg-secondary fixed z-40 overflow-hidden shadow-lg inset-0 rounded-none md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[min(40rem,90vw)] md:h-[min(32rem,80vh)] md:rounded-xl">
			<div className="grid grid-cols-2 border-b border-black/10">
				<button
					type="button"
					className={`flex items-center justify-center h-fit py-3 font-medium transition ${
						activeSection === 'friends'
							? 'bg-primary text-white'
							: 'bg-quatery text-black hover:bg-black/5'
					}`}
					onClick={() => setActiveSection('friends')}
				>
					Friends
				</button>
				<button
					type="button"
					className={`flex items-center justify-center h-fit py-3 font-medium transition ${
						activeSection === 'requests'
							? 'bg-primary text-white'
							: 'bg-quatery text-black hover:bg-black/5'
					}`}
					onClick={() => setActiveSection('requests')}
				>
					Requests
					{incomingCount > 0 && (
						<span className="ml-2 text-xs bg-red-500 text-white rounded-full px-1.5">
							{incomingCount}
						</span>
					)}
				</button>
			</div>
			<div className="h-[calc(100%-5.5rem)] overflow-hidden">
				{activeSection === 'friends' && <FriendsList />}
				{activeSection === 'requests' && <Requests />}
			</div>
			<button
				type="button"
				className="absolute bottom-0 left-0 right-0 py-2 text-base font-semibold text-tertiary bg-black hover:opacity-90 w-full"
				onClick={() => setOpenFriendsDialog(false)}
			>
				Close
			</button>
		</div>
	);
};

export default UsersManagement;
