import Dashboard from '../dashboard/dashboard.component';
import UsersManagement from '../friends/usersManage.component';
import { useContext, useEffect } from 'react';
import { FriendsDialogContext } from '../../context/friendsDialog.context';
import { useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { getInitialData } from '../../store/thunks/thunks';
import { selectCurrentUser } from '../../store/user/user.selector';

const Admin = () => {
	const { openDialog, setOpenDialog } = useContext(FriendsDialogContext);
	const dialogRef = useRef();
	const dispatch = useDispatch();
	const { currentUser } = useSelector(selectCurrentUser);

	useEffect(() => {
		const promise = dispatch(getInitialData(currentUser.id));

		return () => {
			promise.abort();
		};
	}, [dispatch, currentUser]);

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
