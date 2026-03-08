import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser } from '../../store/user/user.selector';
import { useEffect, useState } from 'react';
import { setCurrentUser } from '../../store/user/user.reducer';
import * as userService from '../../services/userService';

const ProfilePicture = ({ file }) => {
	const { currentUser } = useSelector(selectCurrentUser);
	const [isUpdated, setIsUpdated] = useState(false);
	const dispatch = useDispatch();

	useEffect(() => {
		if (!file || !currentUser || isUpdated) return;

		const uploadProfilePic = async () => {
			try {
				const result = await userService.uploadAvatar(file);
				const newPhotoURL = result.photoURL || result.url;

				dispatch(
					setCurrentUser({
						...currentUser,
						photoURL: newPhotoURL,
					})
				);

				setIsUpdated(true);
			} catch (error) {
				console.error('Error uploading profile picture:', error);
			}
		};

		uploadProfilePic();
	}, [file, currentUser, dispatch, isUpdated]);

	return null;
};

export default ProfilePicture;
