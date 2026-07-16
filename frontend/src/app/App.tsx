import '@/styles/tailwind.css';
import '@/styles/global.css';
import 'react-toastify/dist/ReactToastify.css';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import Router from '@/components/router/router.component';
import {
	clearCurrentUser,
	setCurrentUser,
	setLoading,
} from '@/store/user/user.reducer';
import { getToken, getMe, refreshToken, clearToken } from '@/shared/api/auth';
import { presenceHub } from '@/shared/ws/presenceHub';
import { fetchChats } from '@/store/chats/chats.reducer';
import { getInitialData } from '@/store/thunks/thunks';
import type { AppDispatch } from '@/store/store';
import { ConnectionBanner } from '@/shared/ui';

function App() {
	const dispatch = useDispatch<AppDispatch>();

	useEffect(() => {
		let unsub: (() => void) | null = null;

		const initAuth = async () => {
			let token = getToken();
			if (!token) {
				// Cookie may still hold a refresh token after access expired
				try {
					token = await refreshToken();
				} catch {
					dispatch(clearCurrentUser());
					dispatch(setLoading(false));
					return;
				}
			}

			try {
				let user;
				try {
					user = await getMe();
				} catch {
					// Access token expired — refresh once then retry
					await refreshToken();
					user = await getMe();
				}
				dispatch(
					setCurrentUser({
						id: user.id,
						name: user.name,
						email: user.email,
						photoURL: user.photoURL,
						userName: user.userName,
					})
				);

				const handleWsEvent = (event: Record<string, unknown>) => {
					if (!event?.event) return;
					const ev = event.event as string;

					// Let CallProvider handle call_* / webrtc_* via its own subscription
					if (
						ev.startsWith('call_') ||
						ev.startsWith('webrtc_')
					) {
						return;
					}

					switch (ev) {
						case 'friend_request': {
							const data = event.data as {
								id?: string;
								senderId?: string;
								senderName?: string;
							};
							// toastId prevents duplicate stacks when both presence
							// connections or StrictMode re-fire the same event
							const id =
								data?.id ||
								data?.senderId ||
								String(Date.now());
							toast.info(
								`New friend request from ${data?.senderName || 'someone'}!`,
								{
									position: 'top-right',
									autoClose: 5000,
									toastId: `friend_request-${id}`,
								}
							);
							dispatch(getInitialData(user.id));
							break;
						}
						case 'request_accepted': {
							const data = event.data as {
								acceptedByName?: string;
								acceptedById?: string;
							};
							toast.success(
								`${data?.acceptedByName || 'User'} accepted your request!`,
								{
									position: 'top-right',
									autoClose: 5000,
									toastId: `request_accepted-${data?.acceptedById || data?.acceptedByName || 'x'}`,
								}
							);
							dispatch(getInitialData(user.id));
							dispatch(fetchChats(user.id));
							break;
						}
						case 'request_rejected': {
							const data = event.data as {
								rejectedByName?: string;
								rejectedById?: string;
							};
							toast.error(
								`${data?.rejectedByName || 'User'} declined your request.`,
								{
									position: 'top-right',
									autoClose: 5000,
									toastId: `request_rejected-${data?.rejectedById || data?.rejectedByName || 'x'}`,
								}
							);
							dispatch(getInitialData(user.id));
							break;
						}
						case 'user_status_changed':
						case 'user_online':
						case 'user_offline':
							dispatch(getInitialData(user.id));
							dispatch(fetchChats(user.id));
							break;
						case 'chats_updated':
						case 'groups_updated':
							dispatch(fetchChats(user.id));
							break;
						default:
							break;
					}
				};

				unsub = presenceHub.subscribe(handleWsEvent);
				presenceHub.connect(user.id);
			} catch (error) {
				console.error('Auth check failed:', error);
				clearToken();
				dispatch(clearCurrentUser());
			}

			dispatch(setLoading(false));
		};

		void initAuth();

		return () => {
			// StrictMode-safe: drop handler only. Keep WS alive for CallProvider.
			// Full disconnect happens on logout.
			if (unsub) {
				unsub();
			}
		};
	}, [dispatch]);

	return (
		<>
			<ConnectionBanner />
			<Router />
			<ToastContainer position="top-right" newestOnTop closeOnClick />
		</>
	);
}

export default App;
