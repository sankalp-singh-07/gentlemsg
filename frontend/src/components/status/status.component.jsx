import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../store/user/user.selector';
import { connectPresence } from '../../services/websocket';

const Status = () => {
	const { currentUser } = useSelector(selectCurrentUser);

	useEffect(() => {
		if (!currentUser) return;

		// Connect to presence WebSocket — backend auto-handles online/offline
		const ws = connectPresence(currentUser.id, (event) => {
			console.log('[Status Event]', event);
		});

		return () => {
			if (ws && ws._cleanup) {
				ws._cleanup();
			}
		};
	}, [currentUser]);

	return null;
};

export default Status;
