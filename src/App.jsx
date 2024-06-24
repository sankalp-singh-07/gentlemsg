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
import { onAuthStateChangedListener } from './utils/firebase';
import Status from './components/status/status.component';

function App() {
	const dispatch = useDispatch();

	useEffect(() => {
		const unsubscribe = onAuthStateChangedListener((user) => {
			if (user) {
				dispatch(
					setCurrentUser({
						uid: user.uid,
						name: user.displayName,
						email: user.email,
						photoURL: user.photoURL,
					})
				);
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
