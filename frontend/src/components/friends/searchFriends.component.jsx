import { useState, useEffect } from 'react';
import * as userService from '@/services/userService';
import { sendRequests } from '@/store/thunks/thunks';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentUser } from '@/store/user/user.selector';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { Avatar } from '@/shared/ui';

const SearchFriends = () => {
	const [users, setUsers] = useState([]);
	const dispatch = useDispatch();
	const { currentUser } = useSelector(selectCurrentUser);
	const [requestStatus, setRequestStatus] = useState({});
	const [searchTerm, setSearchTerm] = useState('');
	const debouncedSearch = useDebounce(searchTerm, 300);

	useEffect(() => {
		const run = async () => {
			if (
				!debouncedSearch.trim() ||
				debouncedSearch === currentUser?.userName
			) {
				setUsers([]);
				return;
			}

			try {
				const result = await userService.searchUsers(debouncedSearch.trim());
				const usersArr = Array.isArray(result) ? result : [result];
				setUsers(
					usersArr
						.filter(
							(u) =>
								u &&
								u.id &&
								u.userName !== currentUser?.userName
						)
						.map((u) => ({
							uid: u.uid || u.id,
							name: u.name,
							photoURL: u.photoURL,
							userName: u.userName,
						}))
				);
			} catch (error) {
				console.error('Search error:', error);
				setUsers([]);
			}
		};
		void run();
	}, [debouncedSearch, currentUser?.userName]);

	const handleRequest = async (user) => {
		setRequestStatus((prev) => ({ ...prev, [user.uid]: 'loading' }));
		if (!currentUser) return;
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
	};

	return (
		<div className="bg-secondary rounded-md absolute top-0 bottom-0 left-0 right-0 m-auto p-5 max-sm:w-4/5 w-max h-max z-20 shadow-lg">
			<div className="flex gap-4">
				<input
					type="text"
					placeholder="Search users by username"
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className="bg-tertiary p-2 rounded-md w-full h-10 placeholder:text-sm placeholder:font-medium focus:placeholder-transparent focus:outline-none"
					aria-label="Search users"
				/>
			</div>
			{debouncedSearch.trim() && users.length === 0 && (
				<p className="text-sm text-black/60 mt-4 text-center">No users found</p>
			)}
			{users.map((user) => (
				<div
					className="flex mt-5 items-center justify-between gap-8"
					key={user.uid}
				>
					<div className="flex gap-3 items-center min-w-0">
						<Avatar src={user.photoURL} alt={user.name} size={48} />
						<div className="min-w-0">
							<h4 className="text-tertiary font-medium truncate">
								{user.name}
							</h4>
							{user.userName && (
								<p className="text-xs text-black/50 truncate">
									@{user.userName}
								</p>
							)}
						</div>
					</div>
					<button
						type="button"
						className={`border-2 rounded-md text-sm p-2 font-medium flex items-center justify-center min-w-[70px] flex-shrink-0 transition-colors
							${
								requestStatus[user.uid] === 'success'
									? 'bg-green-500 text-white border-green-500 cursor-default'
									: requestStatus[user.uid] === 'failed'
										? 'bg-red-500 text-white border-red-500 hover:bg-red-600 cursor-pointer'
										: requestStatus[user.uid] === 'loading'
											? 'bg-gray-400 text-white border-gray-400 cursor-not-allowed'
											: 'bg-primary text-tertiary hover:bg-quatery border-primary cursor-pointer hover:text-primary'
							}`}
						onClick={() => {
							if (
								!requestStatus[user.uid] ||
								requestStatus[user.uid] === 'failed'
							) {
								handleRequest(user);
							}
						}}
						disabled={
							requestStatus[user.uid] === 'loading' ||
							requestStatus[user.uid] === 'success'
						}
					>
						{requestStatus[user.uid] === 'loading'
							? '…'
							: requestStatus[user.uid] === 'success'
								? '✓'
								: requestStatus[user.uid] === 'failed'
									? 'Retry'
									: 'Add'}
					</button>
				</div>
			))}
		</div>
	);
};

export default SearchFriends;
