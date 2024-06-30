import Dashboard from '../dashboard/dashboard.component';
import UsersManagement from '../friends/usersManage.component';
import { useContext, useEffect } from 'react';
import { FriendsDialogContext } from '../../context/friendsDialog.context';
import { useRef } from 'react';

const Admin = () => {
	const { openDialog, setOpenDialog } = useContext(FriendsDialogContext);
	const dialogRef = useRef();
	console.log(openDialog);

	useEffect(() => {
		const handleDialog = (e) => {
			if (dialogRef.current && !dialogRef.current.contains(e.target))
				setOpenDialog(false);
		};

		window.addEventListener('click', handleDialog);

		return () => {
			window.addEventListener('click', handleDialog);
		};
	}, [setOpenDialog]);

	return (
		<div className="w-screen h-screen flex">
			<Dashboard />
			<div ref={dialogRef}>{openDialog && <UsersManagement />}</div>
		</div>
	);
};

export default Admin;
