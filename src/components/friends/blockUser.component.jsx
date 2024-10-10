import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../store/user/user.selector';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { useEffect } from 'react';

const BlockUser = ({ chatId }) => {
	const { currentUser } = useSelector(selectCurrentUser);
	const receiverData = chatId
		.split('-')
		.filter((el) => el !== currentUser.id)[0];

	useEffect(() => {
		const blocking = async () => {
			try {
				const userRef = doc(db, 'users', currentUser.id);

				await updateDoc(userRef, {
					blocked: arrayUnion(receiverData),
				});
			} catch (error) {
				console.log('Error blocking user: ', error);
			}
		};

		blocking();
	}, [chatId]);

	return null;
};

export default BlockUser;
