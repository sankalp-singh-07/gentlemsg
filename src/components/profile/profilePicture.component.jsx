import { db, storage } from '../../utils/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser } from '../../store/user/user.selector';
import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { setCurrentUser } from '../../store/user/user.reducer';

const ProfilePicture = ({ file }) => {
	const { currentUser } = useSelector(selectCurrentUser);
	const [downloadURL, setDownloadURL] = useState(null);
	const [isUpdated, setIsUpdated] = useState(false);
	const dispatch = useDispatch();

	useEffect(() => {
		if (file && currentUser) {
			const storageRef = ref(
				storage,
				`profilePictures/${currentUser.id}_${file.name}`
			);

			const uploadTask = uploadBytesResumable(storageRef, file);

			uploadTask.on(
				'state_changed',
				() => {},
				(error) => {
					console.error('Error uploading file', error);
				},
				async () => {
					try {
						const url = await getDownloadURL(
							uploadTask.snapshot.ref
						);
						setDownloadURL(url);
					} catch (error) {
						console.error('Error getting download URL', error);
					}
				}
			);
		}
	}, [file, currentUser]);

	useEffect(() => {
		const changeProfilePicture = async () => {
			if (downloadURL && currentUser && currentUser.id && !isUpdated) {
				try {
					const userRef = doc(db, 'users', currentUser.id);
					const userSnap = await getDoc(userRef);

					if (userSnap.exists()) {
						await updateDoc(userRef, { photoURL: downloadURL });

						const user = userSnap.data();
						dispatch(
							setCurrentUser({
								id: currentUser.id,
								name: user.displayName || currentUser.name,
								email: user.email || currentUser.email,
								photoURL: downloadURL,
							})
						);

						setIsUpdated(true);
					} else {
						console.error('User document does not exist');
					}
				} catch (error) {
					console.error('Error updating Firestore', error);
				}
			}
		};

		if (downloadURL && !isUpdated) {
			changeProfilePicture();
		}
	}, [downloadURL, currentUser, dispatch, isUpdated]);

	return null;
};

export default ProfilePicture;
