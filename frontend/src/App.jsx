import '../src/styles/tailwind.css';
import '../src/styles/global.css';
import Router from './components/router/router.component';
import { useDispatch } from 'react-redux';
import { useEffect } from 'react';
import {
	clearCurrentUser,
	setCurrentUser,
	setLoading,
} from './store/user/user.reducer';
import { getToken } from './services/authService';
import { getMe } from './services/authService';
import { connectPresence } from './services/websocket';

function App() {
	const dispatch = useDispatch();

	useEffect(() => {
		const initAuth = async () => {
			const token = getToken();
			if (token) {
				try {
					const user = await getMe();
					dispatch(
						setCurrentUser({
							id: user.id,
							name: user.name,
							email: user.email,
							photoURL: user.photoURL,
							userName: user.userName,
						})
					);

					// Connect presence WebSocket (auto online/offline)
					const presenceWs = connectPresence(user.id, (event) => {
						// Handle real-time events (friend requests, etc.)
						console.log('[Presence Event]', event);
					});

					// Cleanup on unmount
					return () => {
						if (presenceWs && presenceWs._cleanup) {
							presenceWs._cleanup();
						}
					};
				} catch (error) {
					console.error('Auth check failed:', error);
					dispatch(clearCurrentUser());
				}
			} else {
				dispatch(clearCurrentUser());
			}
			dispatch(setLoading(false));
		};

		initAuth();
	}, [dispatch]);

	return (
		<>
			<Router />
		</>
	);
}

export default App;
