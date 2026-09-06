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
		<div className="bg-secondary fixed z-40 overflow-hidden shadow-lg flex flex-col inset-0 rounded-none md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[min(36rem,90vw)] md:max-h-[70vh] md:rounded-xl">
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
						className="flex bg-tertiary px-3 py-2.5 justify-between items-start gap-3 rounded-lg w-full text-left"
					>
						<div className="flex items-start gap-3 min-w-0 flex-1 text-left">
							<Avatar
								src={notif.photoURL}
								alt={notif.userName || 'User'}
								size={40}
							/>
							<div className="min-w-0 flex-1 text-left">
								<p className="text-sm text-black text-left leading-snug break-words">
									{messageGen(notif)}
								</p>
								<p className="text-xs text-black/50 text-left mt-1">
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
