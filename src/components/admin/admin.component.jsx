import Dashboard from '../dashboard/dashboard.component';
import UsersManagement from '../friends/usersManage.component';
import { useContext, useEffect } from 'react';
import { DialogContext } from '../../context/dialog.context';
import { useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { getInitialData } from '../../store/thunks/thunks';
import { selectCurrentUser } from '../../store/user/user.selector';
import Notifications from '../notifs/notifs.component';
import Media from '../chat/childComponents/media.component';
import UpdateProfile from '../profile/updateProfile.component';

const Admin = () => {
	const {
		openFriendsDialog,
		openNotifsDialog,
		openMediaDialog,
		openProfileDialog,
		setOpenFriendsDialog,
		setOpenNotifsDialog,
		setOpenProfileDialog,
	} = useContext(DialogContext);
	const friendsDialogRef = useRef();
	const notifsDialogRef = useRef();
	const mediaDialogRef = useRef();
	const profileDialogRef = useRef();
	const dispatch = useDispatch();
	const { currentUser } = useSelector(selectCurrentUser);

	useEffect(() => {
		const promise = dispatch(getInitialData(currentUser.id));

		return () => {
			promise.abort();
		};
	}, [dispatch, currentUser]);

	useEffect(() => {
		const handleFriendsDialog = (e) => {
			if (
				friendsDialogRef.current &&
				!friendsDialogRef.current.contains(e.target)
			)
				setOpenFriendsDialog(false);
		};

		window.addEventListener('click', handleFriendsDialog);

		return () => {
			window.addEventListener('click', handleFriendsDialog);
		};
	}, [setOpenFriendsDialog]);

	useEffect(() => {
		const handleNotifsDialog = (e) => {
			if (
				notifsDialogRef.current &&
				!notifsDialogRef.current.contains(e.target)
			)
				setOpenNotifsDialog(false);
		};

		window.addEventListener('click', handleNotifsDialog);

		return () => {
			window.addEventListener('click', handleNotifsDialog);
		};
	}, [setOpenNotifsDialog]);

	useEffect(() => {
		const handleProfileDialog = (e) => {
			if (
				profileDialogRef.current &&
				!profileDialogRef.current.contains(e.target)
			)
				setOpenProfileDialog(false);
		};

		window.addEventListener('click', handleProfileDialog);

		return () => {
			window.addEventListener('click', handleProfileDialog);
		};
	}, [setOpenProfileDialog]);

	return (
		<div className="w-screen h-screen flex">
			<Dashboard />
			<div ref={friendsDialogRef}>
				{openFriendsDialog && <UsersManagement />}
			</div>
			<div ref={notifsDialogRef}>
				{openNotifsDialog && <Notifications />}
			</div>
			<div ref={profileDialogRef}>
				{openProfileDialog && <UpdateProfile />}
			</div>
			<div ref={mediaDialogRef}>{openMediaDialog && <Media />}</div>
		</div>
	);
};

export default Admin;
