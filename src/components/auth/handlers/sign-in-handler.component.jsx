import { auth, googleProvider, db } from '../../../utils/firebase';
import { signInWithPopup } from 'firebase/auth';
import {
	setDoc,
	doc,
	serverTimestamp,
	getDoc,
	updateDoc,
	writeBatch,
} from 'firebase/firestore';
import { setCookie } from '../../../utils/cookies';

const SignInHandler = async () => {
	const userNameCreate = (name) => name.split(' ')[0].toLowerCase();

	try {
		const result = await signInWithPopup(auth, googleProvider);
		const user = result.user;

		if (user) {
			const token = await user.getIdToken();
			setCookie(token);

			const userRef = doc(db, 'users', user.uid);
			const userSnapshot = await getDoc(userRef);
			if (userSnapshot.exists()) {
				await updateDoc(userRef, {
					isOnline: true,
					lastActive: serverTimestamp(),
				});
			} else {
				const batch = writeBatch(db);

				batch.set(userRef, {
					id: user.uid,
					name: user.displayName,
					email: user.email,
					photoURL: user.photoURL,
					lastActive: serverTimestamp(),
					isOnline: true,
					friends: [],
					blocked: {},
					requests: [],
					notifs: [],
					userName: userNameCreate(user.displayName),
				});

				const userChatsRef = doc(db, 'userChats', user.uid);

				batch.set(userChatsRef, {
					chats: [],
				});

				await batch.commit();
			}
		}
	} catch (error) {
		console.error('Error signing in with Google.', error);
	}
};

export default SignInHandler;
