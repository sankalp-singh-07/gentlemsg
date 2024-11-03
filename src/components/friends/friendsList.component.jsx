import { useSelector } from 'react-redux';
import { friendSelector } from '../../store/friends/friends.selector';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { DialogContext } from '../../context/dialog.context';
import { MessageContext } from '../../context/message.context';
import { selectCurrentUser } from '../../store/user/user.selector';
import { generateChatId } from '../messages/userChat';

const FriendsList = () => {
	const { friends, blocked } = useSelector(friendSelector);
	const { currentUser } = useSelector(selectCurrentUser);
	const [users, setUsers] = useState([]);
	const [myFriends, setMyFriends] = useState([]);
	const [loading, setLoading] = useState(true);

	const navigate = useNavigate();

	const { setOpenFriendsDialog } = useContext(DialogContext);
	const { setChatId } = useContext(MessageContext);

	const fetchFriendsData = async (id) => {
		const ref = doc(db, 'users', id);
		const docSnap = await getDoc(ref);

		if (docSnap.exists()) {
			const { userName, photoURL, name, email } = docSnap.data();
			return { id, userName, photoURL, name, email };
		}
	};

	useEffect(() => {
		setUsers(friends.filter((id) => !users.includes(id)));
	}, [friends]);

	useEffect(() => {
		const fetchFriends = async () => {
			const friendsData = await Promise.all(
				users.map((id) => fetchFriendsData(id))
			);
			setMyFriends(friendsData.filter((friend) => friend !== null));
			setLoading(false);
		};
		if (users.length) {
			fetchFriends();
		}
	}, [users]);

	if (loading) {
		setTimeout(() => {
			setLoading(false);
		}, 15000);
		return <h1>Loading...</h1>;
	}

	const handleGoToProfile = (e) => {
		const chatId = generateChatId(currentUser.id, e.id);
		setChatId(chatId);
		const currentWidth = window.innerWidth;
		if (currentWidth <= 600) {
			navigate('/chat');
		}
		setOpenFriendsDialog(false);
	};

	return (
		<div className="grid gap-4 grid-cols-1 md:grid-cols-2 mx-4 my-4 overflow-scroll scrollbar-hide">
			{myFriends.map((friend, index) => (
				<div
					key={index}
					className="flex bg-quatery p-4 rounded shadow-md items-center justify-between"
				>
					<div className="flex items-center gap-2 md:gap-3">
						<img
							src={friend.photoURL}
							alt="..."
							className="w-8 h-8 rounded-full md:w-12 md:h-12"
						/>
						<h1 className="text-sm text-center font-medium min-w-fit lg:text-base">
							{friend.name}
						</h1>
					</div>
					<div>
						<button
							className="bg-primary px-2 py-1 lg:text-base text-sm  rounded text-white"
							onClick={() => handleGoToProfile(friend)}
						>
							Profile
						</button>
					</div>
				</div>
			))}
		</div>
	);
};

export default FriendsList;
