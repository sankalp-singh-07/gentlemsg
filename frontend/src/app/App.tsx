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
import { getToken, getMe } from '@/shared/api/auth';
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
			const token = getToken();
			if (!token) {
				dispatch(clearCurrentUser());
				dispatch(setLoading(false));
				return;
			}

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
						case 'friend_request':
							toast.info(
								`New friend request from ${(event.data as { senderName?: string })?.senderName || 'someone'}!`,
								{ position: 'top-right', autoClose: 5000 }
							);
							dispatch(getInitialData(user.id));
							break;
						case 'request_accepted':
							toast.success(
								`${(event.data as { acceptedByName?: string })?.acceptedByName || 'User'} accepted your request!`,
								{ position: 'top-right', autoClose: 5000 }
							);
							dispatch(getInitialData(user.id));
							dispatch(fetchChats(user.id));
							break;
						case 'request_rejected':
							toast.error(
								`${(event.data as { rejectedByName?: string })?.rejectedByName || 'User'} declined your request.`,
								{ position: 'top-right', autoClose: 5000 }
							);
							dispatch(getInitialData(user.id));
							break;
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
				dispatch(clearCurrentUser());
			}

			dispatch(setLoading(false));
		};

		void initAuth();

		return () => {
			unsub?.();
			presenceHub.disconnect();
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
