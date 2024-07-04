import { useSelector } from 'react-redux';
import { friendSelector } from '../../store/friends/friends.selector';

const FriendsList = () => {
	const { friends } = useSelector(friendSelector);
	console.log(friends);
	return (
		<div>
			<h1>Friends List</h1>
		</div>
	);
};

export default FriendsList;
