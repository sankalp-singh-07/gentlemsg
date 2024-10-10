import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../store/user/user.selector';

const BlockUser = ({ chatId }) => {
	const { currentUser } = useSelector(selectCurrentUser);
	const receiverData = chatId
		.split('-')
		.filter((el) => el !== currentUser.id)[0];

	return null;
};

export default BlockUser;
