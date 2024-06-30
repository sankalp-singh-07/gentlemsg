import { getCookie, removeCookie } from '../../utils/cookies';
import { useEffect } from 'react';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { auth, db } from '../../utils/firebase';
import {
	doc,
	getDoc,
	serverTimestamp,
	setDoc,
	updateDoc,
} from 'firebase/firestore';

const AutoAuth = () => {
	const userNameCreate = (name) => name.split(' ')[0].toLowerCase();

	useEffect(() => {
		const autoLogged = async () => {
			const token = getCookie();
			if (token) {
				try {
					await signInWithCustomToken(auth, token);
					const user = auth.currentUser;
					if (user) {
						console.log(user);
						const userRef = doc(db, 'users', user.uid);
						const userSnapshot = await getDoc(userRef);
						if (userSnapshot.exists()) {
							await updateDoc(userRef, {
								isOnline: true,
								lastActive: serverTimestamp(),
							});
						} else {
							await setDoc(userRef, {
								id: user.uid,
								name: user.displayName,
								email: user.email,
								photoURL: user.photoURL,
								lastActive: serverTimestamp(),
								isOnline: true,
								friends: [],
								blocked: [],
								requests: [],
								userName: userNameCreate(user.displayName),
							});
						}
					} else {
						await signOut(auth);
						removeCookie();
						console.log('User is not available after sign in');
					}
				} catch (error) {
					console.error('Error with Auto Sign In.', error);
					removeCookie();
				}
			}
		};

		autoLogged();
	}, []);

	return null;
};

export default AutoAuth;
