import React, { useContext } from 'react';
import FriendsList from './friendsList.component';
import Requests from './requests.component';
import { DialogContext } from '../../context/dialog.context';
import { useState } from 'react';

const UsersManagement = () => {
	const { setOpenFriendsDialog } = useContext(DialogContext);
	const [activeSection, setActiveSection] = useState('friends');

	const handleSectionChange = (section) => {
		setActiveSection(section);
	};

	return (
		<div className="bg-secondary max-md:w-11/12 max-lg:w-9/12 w-7/12 h-3/5 absolute m-auto top-0 right-0 bottom-0 left-0 shadow-md">
			<div className="grid grid-cols-2 md:grid-cols-2 border-black border-b-4">
				<button
					className="flex items-center justify-center h-fit py-2 bg-gray-200 border-r-2 border-black"
					onClick={() => handleSectionChange('friends')}
				>
					Friends
				</button>
				<button
					className="flex items-center justify-center h-fit py-2 bg-gray-200 border-l-2 border-black"
					onClick={() => handleSectionChange('requests')}
				>
					Requests
				</button>
			</div>
			<div>
				{activeSection === 'friends' && <FriendsList />}
				{activeSection === 'requests' && <Requests />}
			</div>
			<div className="flex flex-1 justify-between items-center absolute bottom-0 left-0 right-0">
				<button
					className="py-1 px-2 text-base font-semibold text-tertiary bg-black hover:bg-tertiary w-full h-9 hover:text-white"
					onClick={() => setOpenFriendsDialog(false)}
				>
					Close
				</button>
			</div>
		</div>
	);
};
export default UsersManagement;
