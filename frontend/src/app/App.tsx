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
import { connectPresence } from '@/shared/ws/presenceClient';
import { fetchChats } from '@/store/chats/chats.reducer';
import { getInitialData } from '@/store/thunks/thunks';
import type { PresenceEvent } from '@/shared/types/api';
import type { AppDispatch } from '@/store/store';

function App() {
	const dispatch = useDispatch<AppDispatch>();

	useEffect(() => {
		let disconnect: (() => void) | null = null;

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

				const handleWsEvent = (event: PresenceEvent) => {
					if (!event?.event) return;

					switch (event.event) {
						case 'friend_request':
							toast.info(
								`New friend request from ${(event as { data?: { senderName?: string } }).data?.senderName || 'someone'}!`,
								{ position: 'top-right', autoClose: 5000 }
							);
							dispatch(getInitialData(user.id));
							break;
						case 'request_accepted':
							toast.success(
								`${(event as { data?: { acceptedByName?: string } }).data?.acceptedByName || 'User'} accepted your request!`,
								{ position: 'top-right', autoClose: 5000 }
							);
							dispatch(getInitialData(user.id));
							dispatch(fetchChats(user.id));
							break;
						case 'request_rejected':
							toast.error(
								`${(event as { data?: { rejectedByName?: string } }).data?.rejectedByName || 'User'} declined your request.`,
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
							dispatch(fetchChats(user.id));
							break;
						default:
							break;
					}
				};

				const presence = connectPresence(user.id, handleWsEvent);
				if (presence) {
					disconnect = () => presence.disconnect();
				}
			} catch (error) {
				console.error('Auth check failed:', error);
				dispatch(clearCurrentUser());
			}

			dispatch(setLoading(false));
		};

		void initAuth();

		return () => {
			disconnect?.();
		};
	}, [dispatch]);

	return (
		<>
			<Router />
			<ToastContainer position="top-right" newestOnTop closeOnClick />
		</>
	);
}

export default App;
