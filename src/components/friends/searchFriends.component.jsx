import { useState, useContext } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { FriendContext } from '../../context/friend.context';
import { sendRequests } from '../../store/thunks/thunks';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentUser } from '../../store/user/user.selector';

const SearchFriends = () => {
	const [users, setUsers] = useState([]);
	const { setFriend } = useContext(FriendContext);

	const dispatch = useDispatch();
	const { currentUser } = useSelector(selectCurrentUser);

	const handleSubmit = async (e) => {
		e.preventDefault();
		const formData = new FormData(e.target);
		const username = formData.get('username');

		console.log(currentUser);

		const usersRef = collection(db, 'users');
		const q = query(usersRef, where('userName', '==', username));

		const querySnapshot = await getDocs(q);

		const users = querySnapshot.docs.map((doc) => ({
			uid: doc.id,
			...doc.data(),
		}));

		setUsers(users);
	};

	const handleRequest = (user) => {
		setFriend(user);
		if (currentUser) {
			dispatch(
				sendRequests({
					senderId: currentUser.id,
					receiverId: user.uid,
				})
			);
		}
	};

	return (
		<>
			<div className=" bg-secondary rounded-md absolute top-0 bottom-0 left-0 right-0 m-auto p-5 max-sm:w-4/5 w-max h-max z-20">
				<form className="flex gap-4" onSubmit={handleSubmit}>
					<input
						type="text"
						placeholder="Search New Users"
						name="username"
						className="bg-tertiary p-2 rounded-md w-full h-10 placeholder:text-sm placeholder:font-medium focus:placeholder-transparent focus:outline-none"
					/>
					<button
						type="submit"
						className="bg-primary border-2 rounded-md text-sm p-2 text-tertiary hover:bg-quatery cursor-pointer hover:border-3 hover:border-primary hover:text-primary font-medium "
					>
						Search
					</button>
				</form>
				{users.map((user) => {
					return (
						<div
							className="flex mt-5 items-center justify-between"
							key={user.id}
						>
							<div className="flex gap-3 items-center">
								<img
									src={user.photoURL}
									alt="user"
									className="w-12 h-12 rounded-full object-cover border-tertiary border-2"
								/>
								<h4 className="text-tertiary font-medium">
									{user.name}
								</h4>
							</div>
							<button
								className="bg-primary border-2 rounded-md text-sm p-2 text-tertiary hover:bg-quatery cursor-pointer hover:border-3 hover:border-primary hover:text-primary font-medium"
								onClick={() => handleRequest(user)}
							>
								Add
							</button>
						</div>
					);
				})}
			</div>
		</>
	);
};

export default SearchFriends;
