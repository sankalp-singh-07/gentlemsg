import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../store/user/user.selector';
import { useEffect } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';

const Status = () => {
	const { currentUser } = useSelector(selectCurrentUser);
	useEffect(() => {
		if (currentUser) {
			const userRef = doc(db, 'users', currentUser.uid);

			const setOffline = async () => {
				await updateDoc(userRef, {
					isOnline: false,
					lastActive: serverTimestamp(),
				});
			};

			const setOnline = async () => {
				await updateDoc(userRef, {
					isOnline: true,
					lastActive: serverTimestamp(),
				});
			};

			setOnline();

			window.addEventListener('beforeunload', setOffline);
			window.addEventListener('unload', setOffline);

			return () => {
				window.removeEventListener('beforeunload', setOffline);
				window.removeEventListener('unload', setOffline);
			};
		}
	}, [currentUser]);

	return null;
};

export default Status;
