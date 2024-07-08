import '../src/styles/tailwind.css';
import '../src/styles/global.css';
import AutoAuth from './components/auth/auto-auth.component';
import Router from './components/router/router.component';
import { useDispatch } from 'react-redux';
import { useEffect } from 'react';
import {
	clearCurrentUser,
	setCurrentUser,
	setLoading,
} from './store/user/user.reducer';
import { db, onAuthStateChangedListener } from './utils/firebase';
import Status from './components/status/status.component';
import { doc, getDoc } from 'firebase/firestore';

function App() {
	const dispatch = useDispatch();

	useEffect(() => {
		const unsubscribe = onAuthStateChangedListener(async (user) => {
			if (user) {
				const userRef = doc(db, 'users', user.uid);
				const userSnap = await getDoc(userRef);

				if (userSnap.exists()) {
					const userData = userSnap.data();
					dispatch(
						setCurrentUser({
							id: user.uid,
							name: userData.displayName || user.displayName,
							email: userData.email || user.email,
							photoURL: userData.photoURL || user.photoURL,
						})
					);
				} else {
					dispatch(
						setCurrentUser({
							id: user.uid,
							name: user.displayName,
							email: user.email,
							photoURL: user.photoURL,
						})
					);
				}
			} else {
				dispatch(clearCurrentUser());
			}
		});

		dispatch(setLoading(false));

		return () => unsubscribe();
	}, [dispatch]);

	return (
		<>
			<AutoAuth />
			<Router />
			<Status />
		</>
	);
}

export default App;
