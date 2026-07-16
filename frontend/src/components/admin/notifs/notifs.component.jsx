import { useSelector, useDispatch } from 'react-redux';
import { friendSelector } from '../../../store/friends/friends.selector';
import { useContext, useEffect, useState } from 'react';
import { DialogContext } from '../../../context/dialog.context';
import * as notificationService from '../../../services/notificationService';
import { removeNotificationLocal } from '../../../store/friends/friends.reducer';
import { Avatar, EmptyState, Button } from '@/shared/ui';
import { X } from 'lucide-react';
import './notifs.styles.css';

const Notifs = () => {
	const { notifs } = useSelector(friendSelector);
	const { setOpenNotifsDialog } = useContext(DialogContext);
	const [notifications, setNotifications] = useState(notifs || []);
	const dispatch = useDispatch();

	useEffect(() => {
		setNotifications(notifs || []);
	}, [notifs]);

	const messageGen = (notif) => {
		const who = notif.name || notif.userName || 'Someone';
		if (notif.type === 'accepted') {
			return `${who} accepted your friend request`;
		}
		if (notif.type === 'rejected') {
			return `${who} declined your friend request`;
		}
		return `${who} · ${notif.type || 'notification'}`;
	};

	const getDate = (timeStamp) => {
		if (!timeStamp) return '';
		const date = new Date(
			typeof timeStamp === 'number' ? timeStamp : timeStamp
		);
		return new Intl.DateTimeFormat(undefined, {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit',
		}).format(date);
	};

	const handleDelete = async (notif) => {
		setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
		dispatch(removeNotificationLocal(notif.id));
		try {
			await notificationService.deleteNotification(notif.id);
		} catch (error) {
			console.error('Error deleting notification:', error);
		}
	};

	return (
		<div className="bg-secondary max-md:w-11/12 max-lg:w-9/12 w-6/12 max-h-[70vh] absolute m-auto top-0 right-0 bottom-0 left-0 shadow-lg rounded-xl overflow-hidden z-40 flex flex-col">
			<div className="flex items-center justify-between px-4 py-3 border-b border-black/10">
				<h2 className="font-semibold text-black">Notifications</h2>
				<button
					type="button"
					onClick={() => setOpenNotifsDialog(false)}
					aria-label="Close"
					className="p-1 hover:bg-black/5 rounded"
				>
					<X size={18} />
				</button>
			</div>
			<div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
				{(!notifications || notifications.length === 0) && (
					<EmptyState
						title="All caught up"
						description="No notifications right now."
					/>
				)}
				{notifications.map((notif, index) => (
					<div
						key={notif.id || index}
						className="flex bg-tertiary px-3 py-2 justify-between items-center gap-2 rounded-lg w-full"
					>
						<div className="flex items-center gap-3 min-w-0 flex-1">
							<Avatar
								src={notif.photoURL}
								alt={notif.userName || 'User'}
								size={40}
							/>
							<div className="min-w-0">
								<p className="text-sm text-black truncate">
									{messageGen(notif)}
								</p>
								<p className="text-xs text-black/50">
									{getDate(notif.createdAt)}
								</p>
							</div>
						</div>
						<button
							type="button"
							onClick={() => handleDelete(notif)}
							className="text-black/40 hover:text-red-500 p-1 shrink-0"
							aria-label="Dismiss"
						>
							<X size={16} />
						</button>
					</div>
				))}
			</div>
			<div className="p-3 border-t border-black/10">
				<Button
					variant="secondary"
					className="w-full"
					onClick={() => setOpenNotifsDialog(false)}
				>
					Close
				</Button>
			</div>
		</div>
	);
};

export default Notifs;
