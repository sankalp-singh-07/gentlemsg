import { useSelector } from 'react-redux';
import { friendSelector } from '../../store/friends/friends.selector';
import { useEffect } from 'react';
import { selectCurrentUser } from '../../store/user/user.selector';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';

const UnblockUser = ({ chatId }) => {
	const { currentUser } = useSelector(selectCurrentUser);
	const receiverId = chatId
		.split('-')
		.filter((id) => id != currentUser.id)[0];

	const { blocked } = useSelector(friendSelector);

	useEffect(() => {
		if (!currentUser || !receiverId) return;

		const unblockUser = async () => {
			try {
				const userRef = doc(db, 'users', currentUser.id);
				const receiverRef = doc(db, 'users', receiverId);

				const userSnap = await getDoc(userRef);
				const receiverSnap = await getDoc(receiverRef);

				if (userSnap.exists() && receiverSnap.exists) {
					const userBlocked = { ...userSnap.data().blocked };
					const receiverBlocked = { ...receiverSnap.data().blocked };

					delete userBlocked[chatId];
					delete receiverBlocked[chatId];

					await updateDoc(userRef, {
						blocked: userBlocked,
					});

					await updateDoc(receiverRef, {
						blocked: receiverBlocked,
					});

					console.log('User Unblock Successfull');
				}
			} catch (error) {
				console.log('Error unblocking user', error);
			}
		};

		unblockUser();
	}, [chatId, currentUser, receiverId]);

	return null;
};

export default UnblockUser;
