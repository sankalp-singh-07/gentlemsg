import { useEffect, useState, useContext } from 'react';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { globalSearch } from '@/shared/api/search';
import { Avatar, EmptyState, Skeleton } from '@/shared/ui';
import { MessageContext } from '@/context/message.context';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentUser } from '@/store/user/user.selector';
import { sendRequests } from '@/store/thunks/thunks';
import { createChat } from '@/shared/api/chats';
import { Users } from 'lucide-react';
import {
	getRecentSearches,
	pushRecentSearch,
	clearRecentSearches,
} from '@/shared/lib/recentSearch';
import { Search, X } from 'lucide-react';
import { toast } from 'react-toastify';

const GlobalSearch = () => {
	const [open, setOpen] = useState(false);
	const [term, setTerm] = useState('');
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState(null);
	const [recent, setRecent] = useState(() => getRecentSearches());
	const debounced = useDebounce(term, 300);
	const { setChatId, setGroupId } = useContext(MessageContext);
	const navigate = useNavigate();
	const dispatch = useDispatch();
	const { currentUser } = useSelector(selectCurrentUser);

	useEffect(() => {
		const onKey = (e) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				setOpen(true);
			}
			if (e.key === 'Escape') setOpen(false);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);

	useEffect(() => {
		if (!open) return;
		if (debounced.trim().length < 2) {
			setResult(null);
			return;
		}
		let cancelled = false;
		(async () => {
			setLoading(true);
			try {
				const data = await globalSearch(debounced.trim());
				if (!cancelled) {
					setResult(data);
					setRecent(pushRecentSearch(debounced.trim()));
				}
			} catch {
				if (!cancelled) toast.error('Search failed');
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [debounced, open]);

	const openChat = async (chatId) => {
		setChatId(chatId);
		setOpen(false);
		if (window.innerWidth <= 600) navigate('/chat');
	};

	const openChatWithUser = async (userId) => {
		try {
			const chat = await createChat(userId);
			await openChat(chat.id);
		} catch {
			toast.error('Could not open chat');
		}
	};

	const addFriend = async (userId) => {
		try {
			await dispatch(
				sendRequests({
					senderId: currentUser.id,
					receiverId: userId,
				})
			).unwrap();
			toast.success('Friend request sent');
		} catch {
			toast.error('Could not send request');
		}
	};

	if (!open) {
		return (
			<button
				type="button"
				className="flex items-center gap-2 flex-1 bg-tertiary rounded-lg px-3 py-2 text-sm text-black/50 hover:bg-black/5 transition"
				onClick={() => setOpen(true)}
				aria-label="Search"
			>
				<Search size={16} />
				<span className="truncate">Search users & chats</span>
				<kbd className="hidden sm:inline text-[10px] border border-black/10 rounded px-1 ml-auto">
					⌘K
				</kbd>
			</button>
		);
	}

	return (
		<div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 bg-black/40">
			<div className="bg-secondary w-full max-w-lg rounded-xl shadow-2xl overflow-hidden">
				<div className="flex items-center gap-2 px-3 py-3 border-b border-black/10">
					<Search size={18} className="text-black/40" />
					<input
						autoFocus
						value={term}
						onChange={(e) => setTerm(e.target.value)}
						placeholder="Search users and chats…"
						className="flex-1 bg-transparent outline-none text-black"
					/>
					<button
						type="button"
						onClick={() => setOpen(false)}
						className="p-1 text-black/50 hover:text-black"
						aria-label="Close search"
					>
						<X size={18} />
					</button>
				</div>

				<div className="max-h-[60vh] overflow-y-auto p-3">
					{term.trim().length < 2 && recent.length > 0 && (
						<div className="mb-3">
							<div className="flex justify-between mb-1">
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
							{recent.map((r) => (
								<button
									key={r}
									type="button"
									className="block w-full text-left px-2 py-1.5 rounded hover:bg-tertiary text-sm"
									onClick={() => setTerm(r)}
								>
									{r}
								</button>
							))}
						</div>
					)}

					{loading && (
						<div className="space-y-2 py-2">
							{[1, 2, 3].map((i) => (
								<div key={i} className="flex gap-2 items-center">
									<Skeleton className="w-10 h-10 rounded-full" />
									<Skeleton className="h-3 flex-1" />
								</div>
							))}
						</div>
					)}

					{!loading && result && (
						<>
							{result.groups?.length > 0 && (
								<section className="mb-4">
									<p className="text-xs font-semibold text-black/50 uppercase mb-2">
										Groups
									</p>
									{result.groups.map((g) => (
										<button
											key={g.id}
											type="button"
											className="flex w-full items-center gap-3 px-2 py-2 rounded-lg hover:bg-tertiary text-left"
											onClick={() => {
												setGroupId(g.id);
												setOpen(false);
												if (window.innerWidth <= 600) navigate('/chat');
											}}
										>
											<div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
												<Users size={18} />
											</div>
											<div className="min-w-0">
												<p className="font-medium truncate">{g.name}</p>
												<p className="text-xs text-black/50 truncate">
													{g.lastMessage}
												</p>
											</div>
										</button>
									))}
								</section>
							)}
							{result.chats?.length > 0 && (
								<section className="mb-4">
									<p className="text-xs font-semibold text-black/50 uppercase mb-2">
										Chats
									</p>
									{result.chats.map((c) => (
										<button
											key={c.chatId}
											type="button"
											className="flex w-full items-center gap-3 px-2 py-2 rounded-lg hover:bg-tertiary text-left"
											onClick={() => openChat(c.chatId)}
										>
											<Avatar
												src={c.receiverPhotoURL}
												alt={c.receiverName}
												size={40}
											/>
											<div className="min-w-0">
												<p className="font-medium truncate">
													{c.receiverName}
												</p>
												<p className="text-xs text-black/50 truncate">
													{c.lastMessage}
												</p>
											</div>
										</button>
									))}
								</section>
							)}

							{result.users?.length > 0 && (
								<section className="mb-2">
									<p className="text-xs font-semibold text-black/50 uppercase mb-2">
										Users
									</p>
									{result.users.map((u) => (
										<div
											key={u.id || u.uid}
											className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-tertiary"
										>
											<button
												type="button"
												className="flex items-center gap-3 min-w-0 text-left flex-1"
												onClick={() =>
													openChatWithUser(u.id || u.uid)
												}
											>
												<Avatar
													src={u.photoURL}
													alt={u.name}
													size={40}
												/>
												<div className="min-w-0">
													<p className="font-medium truncate">
														{u.name}
													</p>
													<p className="text-xs text-black/50 truncate">
														@{u.userName}
													</p>
												</div>
											</button>
											<button
												type="button"
												className="text-xs bg-primary text-white px-2 py-1 rounded-md shrink-0"
												onClick={() =>
													addFriend(u.id || u.uid)
												}
											>
												Add
											</button>
										</div>
									))}
								</section>
							)}

							{!result.users?.length &&
								!result.chats?.length &&
								!result.groups?.length && (
								<EmptyState
									title="No results"
									description="Try another name or username."
									className="py-8"
								/>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
};

export default GlobalSearch;
