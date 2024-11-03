import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../store/user/user.selector';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { useEffect } from 'react';
import { friendSelector } from '../../store/friends/friends.selector';

const BlockUser = ({ chatId }) => {
	const { currentUser } = useSelector(selectCurrentUser);
	const receiverData = chatId
		.split('-')
		.filter((el) => el !== currentUser.id)[0];

	useEffect(() => {
		if (!currentUser || !receiverData) return;

		const blocking = async () => {
			try {
				const userRef = doc(db, 'users', currentUser.id);
				const receiverRef = doc(db, 'users', receiverData);

				const userSnap = await getDoc(userRef);
				const receiverSnap = await getDoc(receiverRef);

				if (userSnap.exists() && receiverSnap.exists()) {
					const userBlocked = userSnap.data().blocked || {};
					const receiverBlocked = receiverSnap.data().blocked || {};

					const blockData = {
						[chatId]: {
							blockedUser: receiverData,
							blockedBy: currentUser.id,
						},
					};

					await updateDoc(userRef, {
						blocked: {
							...userBlocked,
							...blockData,
						},
					});

					await updateDoc(receiverRef, {
						blocked: {
							...receiverBlocked,
							...blockData,
						},
					});
				}
				console.log('User blocked successfully');
			} catch (error) {
				console.log('Error blocking user: ', error);
			}
		};

		blocking();
	}, [chatId, currentUser, receiverData]);

	return null;
};

export default BlockUser;

/*
 * 	//> if user is already blocked
	const { blocked } = useSelector(friendSelector);

	useEffect(() => {
		for (let id in blocked) {
			if (chatId == id) {
				console.log('already blocked');
			}
		}
	}, [chatId, blocked]);
 */
