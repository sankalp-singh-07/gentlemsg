import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../store/user/user.selector';
import { useEffect } from 'react';
import * as friendService from '../../services/friendService';

const UnblockUser = ({ chatId }) => {
	const { currentUser } = useSelector(selectCurrentUser);

	useEffect(() => {
		if (!currentUser || !chatId) return;

		const unblock = async () => {
			try {
				await friendService.unblockUser(chatId);
				console.log('User unblocked successfully');
			} catch (error) {
				console.error('Error unblocking user:', error);
			}
		};

		unblock();
	}, [chatId, currentUser]);

	return null;
};

export default UnblockUser;
