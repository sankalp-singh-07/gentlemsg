import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../store/user/user.selector';
import { useEffect } from 'react';
import * as friendService from '../../services/friendService';

const BlockUser = ({ chatId }) => {
	const { currentUser } = useSelector(selectCurrentUser);

	useEffect(() => {
		if (!currentUser || !chatId) return;

		const blocking = async () => {
			try {
				await friendService.blockUser(chatId);
				console.log('User blocked successfully');
			} catch (error) {
				console.error('Error blocking user:', error);
			}
		};

		blocking();
	}, [chatId, currentUser]);

	return null;
};

export default BlockUser;
