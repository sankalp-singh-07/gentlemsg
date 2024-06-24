import { auth, googleProvider, db } from '../../../utils/firebase';
import { signInWithPopup } from 'firebase/auth';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { setCookie } from '../../../utils/cookies';

const SignInHandler = async () => {
	try {
		const result = await signInWithPopup(auth, googleProvider);
		const user = result.user;

		const token = await user.getIdToken();
		setCookie(token);

		const userDocRef = doc(db, 'users', user.uid);

		await setDoc(
			doc(db, 'users', user.uid),
			{
				name: user.displayName,
				email: user.email,
				photoURL: user.photoURL,
				lastActive: serverTimestamp(),
				isOnline: true,
				friends: [],
				blocked: [],
			},
			{ merge: true }
		);
	} catch (error) {
		console.error('Error signing in with Google.', error);
	}
};

export default SignInHandler;
