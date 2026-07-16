import { useState, useContext, useEffect } from 'react';
import { FriendContext } from '../../context/friend.context';
import * as userService from '../../services/userService';
import { sendRequests } from '../../store/thunks/thunks';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentUser } from '../../store/user/user.selector';

const SearchFriends = () => {
	const [users, setUsers] = useState([]);
	const { setFriend } = useContext(FriendContext);

	const dispatch = useDispatch();
	const { currentUser } = useSelector(selectCurrentUser);
	const [requestStatus, setRequestStatus] = useState({});

	const [searchTerm, setSearchTerm] = useState('');

	useEffect(() => {
		const delayDebounceFn = setTimeout(async () => {
			if (searchTerm.trim() === '' || searchTerm === currentUser.userName) {
				setUsers([]);
				return;
			}

			try {
				const result = await userService.searchUsers(searchTerm.trim());
				const usersArr = Array.isArray(result) ? result : [result];
				setUsers(
					usersArr
						.filter((u) => u && u.id && u.userName !== currentUser.userName)
						.map((u) => ({
							uid: u.uid || u.id,
							name: u.name,
							email: u.email,
							photoURL: u.photoURL,
							userName: u.userName,
						}))
				);
			} catch (error) {
				console.error('Search error:', error);
				setUsers([]);
			}
		}, 300);

		return () => clearTimeout(delayDebounceFn);
	}, [searchTerm, currentUser.userName]);

	const handleRequest = async (user) => {
		setRequestStatus((prev) => ({ ...prev, [user.uid]: 'loading' }));
		setFriend(user);
		if (currentUser) {
			try {
				const resultAction = await dispatch(
					sendRequests({
						senderId: currentUser.id,
						receiverId: user.uid,
					})
				);
				
				if (resultAction && resultAction.error) {
					setRequestStatus((prev) => ({ ...prev, [user.uid]: 'failed' }));
				} else {
					setRequestStatus((prev) => ({ ...prev, [user.uid]: 'success' }));
				}
			} catch (error) {
				console.error('Request failed:', error);
				setRequestStatus((prev) => ({ ...prev, [user.uid]: 'failed' }));
			}
		}
	};

	return (
		<>
			<div className=" bg-secondary rounded-md absolute top-0 bottom-0 left-0 right-0 m-auto p-5 max-sm:w-4/5 w-max h-max z-20">
				<div className="flex gap-4">
					<input
						type="text"
						placeholder="Search New Users"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="bg-tertiary p-2 rounded-md w-full h-10 placeholder:text-sm placeholder:font-medium focus:placeholder-transparent focus:outline-none"
					/>
				</div>
				{users.map((user) => {
					return (
						<div
							className="flex mt-5 items-center justify-between gap-8"
							key={user.uid}
						>
							<div className="flex gap-3 items-center min-w-0">
								<img
									src={user.photoURL}
									alt="user"
									referrerPolicy="no-referrer"
									className="w-12 h-12 rounded-full object-cover border-tertiary border-2 flex-shrink-0"
								/>
								<h4 className="text-tertiary font-medium truncate">
									{user.name}
								</h4>
							</div>
							<button
								className={`border-2 rounded-md text-sm p-2 font-medium flex items-center justify-center min-w-[70px] flex-shrink-0 transition-colors
									${requestStatus[user.uid] === 'success' ? 'bg-green-500 text-white border-green-500 cursor-default' : 
									  requestStatus[user.uid] === 'failed' ? 'bg-red-500 text-white border-red-500 hover:bg-red-600 hover:border-red-600 cursor-pointer' :
									  requestStatus[user.uid] === 'loading' ? 'bg-gray-400 text-white border-gray-400 cursor-not-allowed' :
									  'bg-primary text-tertiary hover:bg-quatery border-primary hover:border-3 cursor-pointer hover:border-primary hover:text-primary'}
								`}
								onClick={() => {
									if (!requestStatus[user.uid] || requestStatus[user.uid] === 'failed') {
										handleRequest(user);
									}
								}}
								disabled={requestStatus[user.uid] === 'loading' || requestStatus[user.uid] === 'success'}
							>
								{requestStatus[user.uid] === 'loading' ? (
									<svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
								) : requestStatus[user.uid] === 'success' ? (
									<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
										<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
									</svg>
								) : requestStatus[user.uid] === 'failed' ? (
									<svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
										<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
									</svg>
								) : (
									"Add"
								)}
							</button>
						</div>
					);
				})}
			</div>
		</>
	);
};

export default SearchFriends;
