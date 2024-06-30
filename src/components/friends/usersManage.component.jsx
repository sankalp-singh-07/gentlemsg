import React, { useContext } from 'react';
import FriendsList from './friendsList.component';
import Requests from './requests.component';
import { FriendsDialogContext } from '../../context/friendsDialog.context';
import { useState } from 'react';

const UsersManagement = () => {
	const { setOpenDialog } = useContext(FriendsDialogContext);

	return (
		<div className="bg-secondary max-sm:w-9/12 w-6/12 h-3/5 rounded-md absolute m-auto p-4 top-0 right-0 bottom-0 left-0">
			<FriendsList />
			<Requests />
			<button
				className="py-1 px-2 text-sm font-semibold hover:text-quatery bg-quatery hover:bg-primary rounded-full border-2"
				onClick={() => setOpenDialog(false)}
			>
				X
			</button>
		</div>
	);
};
export default UsersManagement;
