import '../src/styles/tailwind.css';
import '../src/styles/global.css';
import 'react-toastify/dist/ReactToastify.css';
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
import { ToastContainer, toast } from 'react-toastify';
import { fetchChats } from './store/chats/chats.reducer';
import { getInitialData } from './store/thunks/thunks';

function App() {
	const dispatch = useDispatch();

	useEffect(() => {
		let presenceWsCleanup = null;

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
					const handleWsEvent = (event) => {
						console.log('[Presence Event]', event);
						if (!event || !event.event) return;

						switch (event.event) {
							case 'friend_request':
								toast.info(`New friend request from ${event.data?.senderName || 'someone'}!`, {
									position: "top-right",
									autoClose: 5000,
								});
								dispatch(getInitialData(user.id));
								break;
							case 'request_accepted':
								toast.success(`${event.data?.acceptedByName || 'User'} accepted your request!`, {
									position: "top-right",
									autoClose: 5000,
								});
								dispatch(getInitialData(user.id));
								dispatch(fetchChats(user.id));
								break;
							case 'request_rejected':
								toast.error(`${event.data?.rejectedByName || 'User'} declined your request.`, {
									position: "top-right",
									autoClose: 5000,
								});
								dispatch(getInitialData(user.id));
								break;
							case 'user_status_changed':
							case 'user_online':
							case 'user_offline':
								dispatch(getInitialData(user.id));
								dispatch(fetchChats(user.id));
								break;
							case 'chats_updated':
								dispatch(fetchChats(user.id));
								break;
							default:
								break;
						}
					};

					const presenceWs = connectPresence(user.id, handleWsEvent);
					if (presenceWs) {
						presenceWsCleanup = presenceWs._cleanup;
					}
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

		// Proper React Cleanup Hook
		return () => {
			if (presenceWsCleanup) {
				presenceWsCleanup();
			}
		};
	}, [dispatch]);

	return (
		<>
			<Router />
			<ToastContainer />
		</>
	);
}

export default App;
