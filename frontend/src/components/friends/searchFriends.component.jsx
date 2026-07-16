import { useState, useEffect } from 'react';
import * as userService from '@/services/userService';
import { sendRequests } from '@/store/thunks/thunks';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentUser } from '@/store/user/user.selector';
import { friendSelector } from '@/store/friends/friends.selector';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { Avatar, Button, EmptyState, Skeleton } from '@/shared/ui';
import {
	getRecentSearches,
	pushRecentSearch,
	clearRecentSearches,
} from '@/shared/lib/recentSearch';
import { toast } from 'react-toastify';

const SearchFriends = ({ onClose }) => {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(false);
	const dispatch = useDispatch();
	const { currentUser } = useSelector(selectCurrentUser);
	const { friends, requests } = useSelector(friendSelector);
	const [requestStatus, setRequestStatus] = useState({});
	const [searchTerm, setSearchTerm] = useState('');
	const [recent, setRecent] = useState(() => getRecentSearches());
	const debouncedSearch = useDebounce(searchTerm, 300);

	const friendIds = new Set((friends || []).map((f) => f.id));
	const pendingTo = new Set(
		(requests || [])
			.filter((r) => r.senderId === currentUser?.id)
			.map((r) => r.receiverId)
	);
	const pendingFrom = new Set(
		(requests || [])
			.filter((r) => r.receiverId === currentUser?.id)
			.map((r) => r.senderId)
	);

	useEffect(() => {
		const run = async () => {
			if (
				!debouncedSearch.trim() ||
				debouncedSearch === currentUser?.userName
			) {
				setUsers([]);
				setLoading(false);
				return;
			}

			setLoading(true);
			try {
				const result = await userService.searchUsers(
					debouncedSearch.trim()
				);
				const usersArr = Array.isArray(result) ? result : [result];
				setUsers(
					usersArr
						.filter((u) => u && (u.id || u.uid))
						.map((u) => ({
							uid: u.uid || u.id,
							name: u.name,
							photoURL: u.photoURL,
							userName: u.userName,
							isOnline: u.isOnline,
							rank: u.rank,
						}))
				);
				setRecent(pushRecentSearch(debouncedSearch.trim()));
			} catch (error) {
				console.error('Search error:', error);
				setUsers([]);
			} finally {
				setLoading(false);
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

			if (resultAction?.error) {
				setRequestStatus((prev) => ({ ...prev, [user.uid]: 'failed' }));
				toast.error('Could not send request');
			} else {
				setRequestStatus((prev) => ({ ...prev, [user.uid]: 'success' }));
				toast.success('Friend request sent');
			}
		} catch {
			setRequestStatus((prev) => ({ ...prev, [user.uid]: 'failed' }));
		}
	};

	const actionFor = (user) => {
		if (friendIds.has(user.uid)) return { label: 'Friends', disabled: true };
		if (pendingTo.has(user.uid) || requestStatus[user.uid] === 'success')
			return { label: 'Pending', disabled: true };
		if (pendingFrom.has(user.uid))
			return { label: 'Respond in Requests', disabled: true };
		if (requestStatus[user.uid] === 'loading')
			return { label: '…', disabled: true, loading: true };
		if (requestStatus[user.uid] === 'failed')
			return { label: 'Retry', disabled: false };
		return { label: 'Add', disabled: false };
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
			onClick={onClose}
			role="presentation"
		>
		<div
			className="bg-secondary rounded-xl w-full max-w-md p-4 shadow-2xl max-h-[75vh] overflow-auto text-left"
			onClick={(e) => e.stopPropagation()}
			role="dialog"
			aria-label="Add friends"
		>
			<div className="flex gap-2 items-center mb-3">
				<input
					type="text"
					placeholder="Search by name or username"
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className="bg-tertiary text-black p-2 rounded-md w-full h-10 placeholder:text-sm focus:outline-none border border-black/10"
					aria-label="Search users"
					autoFocus
				/>
				{onClose && (
					<button
						type="button"
						className="text-sm px-2 py-1 text-black/70 hover:text-black shrink-0"
						onClick={onClose}
					>
						Close
					</button>
				)}
			</div>

			{!debouncedSearch.trim() && recent.length > 0 && (
				<div className="mb-3">
					<div className="flex justify-between items-center mb-1">
						<p className="text-xs font-semibold text-black/50 uppercase">
							Recent
						</p>
						<button
							type="button"
							className="text-xs text-primary"
							onClick={() => {
								clearRecentSearches();
								setRecent([]);
							}}
						>
							Clear
						</button>
					</div>
					<div className="flex flex-wrap gap-1">
						{recent.map((r) => (
							<button
								key={r}
								type="button"
								className="text-xs bg-tertiary px-2 py-1 rounded-full hover:bg-primary hover:text-white transition"
								onClick={() => setSearchTerm(r)}
							>
								{r}
							</button>
						))}
					</div>
				</div>
			)}

			{loading && (
				<div className="space-y-3 py-2">
					{[1, 2, 3].map((i) => (
						<div key={i} className="flex gap-3 items-center">
							<Skeleton className="w-12 h-12 rounded-full" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-3 w-1/2" />
								<Skeleton className="h-3 w-1/3" />
							</div>
						</div>
					))}
				</div>
			)}

			{!loading &&
				debouncedSearch.trim() &&
				users.length === 0 && (
					<EmptyState
						title="No users found"
						description="Try a different name or username."
						className="py-6"
					/>
				)}

			{!loading &&
				users.map((user) => {
					const action = actionFor(user);
					return (
						<div
							className="flex mt-3 items-center justify-between gap-3"
							key={user.uid}
						>
							<div className="flex gap-3 items-center min-w-0">
								<div className="relative">
									<Avatar
										src={user.photoURL}
										alt={user.name}
										size={48}
									/>
									{user.isOnline && (
										<span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-secondary" />
									)}
								</div>
								<div className="min-w-0 text-left">
									<h4 className="text-black font-medium truncate text-left">
										{user.name}
									</h4>
									{user.userName && (
										<p className="text-xs text-black/50 truncate text-left">
											@{user.userName}
										</p>
									)}
								</div>
							</div>
							<Button
								size="sm"
								disabled={action.disabled}
								loading={action.loading}
								onClick={() => {
									if (!action.disabled) handleRequest(user);
								}}
							>
								{action.label}
							</Button>
						</div>
					);
				})}
		</div>
		</div>
	);
};

export default SearchFriends;
