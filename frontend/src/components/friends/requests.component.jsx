import { useDispatch, useSelector } from 'react-redux';
import { friendSelector } from '../../store/friends/friends.selector';
import { selectCurrentUser } from '../../store/user/user.selector';
import {
	acceptRequest,
	rejectRequest,
	cancelFriendRequest,
	getInitialData,
} from '../../store/thunks/thunks';
import { fetchChats } from '../../store/chats/chats.reducer';
import { Avatar, Button, EmptyState } from '@/shared/ui';
import { toast } from 'react-toastify';
import { useState } from 'react';

const Requests = () => {
	const { requests } = useSelector(friendSelector);
	const { currentUser } = useSelector(selectCurrentUser);
	const dispatch = useDispatch();
	const [busy, setBusy] = useState({});

	const received = (requests || []).filter(
		(r) => currentUser?.id === r.receiverId
	);
	const sent = (requests || []).filter(
		(r) => currentUser?.id === r.senderId
	);

	const withBusy = async (key, fn) => {
		setBusy((b) => ({ ...b, [key]: true }));
		try {
			await fn();
		} finally {
			setBusy((b) => ({ ...b, [key]: false }));
		}
	};

	const handleAccept = (senderId) =>
		withBusy(`a-${senderId}`, async () => {
			try {
				await dispatch(
					acceptRequest({ userId: currentUser.id, senderId })
				).unwrap();
				dispatch(fetchChats(currentUser.id));
				dispatch(getInitialData(currentUser.id));
				toast.success('Friend request accepted');
			} catch (e) {
				toast.error('Could not accept request');
			}
		});

	const handleReject = (senderId) =>
		withBusy(`r-${senderId}`, async () => {
			try {
				await dispatch(
					rejectRequest({ userId: currentUser.id, senderId })
				).unwrap();
				toast.info('Request declined');
			} catch {
				toast.error('Could not decline request');
			}
		});

	const handleCancel = (receiverId) =>
		withBusy(`c-${receiverId}`, async () => {
			try {
				await dispatch(cancelFriendRequest({ receiverId })).unwrap();
				toast.info('Request cancelled');
			} catch {
				toast.error('Could not cancel request');
			}
		});

	if (!received.length && !sent.length) {
		return (
			<EmptyState
				title="No pending requests"
				description="When someone sends you a friend request, it will show up here."
			/>
		);
	}

	return (
		<div className="mx-4 my-4 space-y-6 overflow-scroll scrollbar-hide max-h-[50vh] pb-12">
			{received.length > 0 && (
				<section>
					<h3 className="text-xs font-semibold uppercase tracking-wide text-black/50 mb-2">
						Received
					</h3>
					<div className="grid gap-3 grid-cols-1 md:grid-cols-2">
						{received.map((req) => (
							<div
								key={req.id || req.senderId}
								className="bg-quatery p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-center gap-3 justify-between"
							>
								<div className="flex items-center gap-3 min-w-0">
									<Avatar
										src={req.senderPhotoURL}
										alt={req.senderName}
										size={48}
									/>
									<div className="min-w-0">
										<p className="font-medium text-black truncate">
											{req.senderName}
										</p>
										<p className="text-xs text-black/50">
											Wants to connect
										</p>
									</div>
								</div>
								<div className="flex gap-2 shrink-0">
									<Button
										size="sm"
										loading={busy[`a-${req.senderId}`]}
										onClick={() => handleAccept(req.senderId)}
									>
										Accept
									</Button>
									<Button
										size="sm"
										variant="danger"
										loading={busy[`r-${req.senderId}`]}
										onClick={() => handleReject(req.senderId)}
									>
										Reject
									</Button>
								</div>
							</div>
						))}
					</div>
				</section>
			)}

			{sent.length > 0 && (
				<section>
					<h3 className="text-xs font-semibold uppercase tracking-wide text-black/50 mb-2">
						Sent
					</h3>
					<div className="grid gap-3 grid-cols-1 md:grid-cols-2">
						{sent.map((req) => (
							<div
								key={req.id || req.receiverId}
								className="bg-quatery p-4 rounded-xl shadow-sm flex items-center justify-between gap-3"
							>
								<div className="flex items-center gap-3 min-w-0">
									<Avatar
										src={req.receiverPhotoURL}
										alt={req.receiverName}
										size={48}
									/>
									<div className="min-w-0">
										<p className="font-medium text-black truncate">
											{req.receiverName}
										</p>
										<p className="text-xs text-amber-600">Pending</p>
									</div>
								</div>
								<Button
									size="sm"
									variant="ghost"
									loading={busy[`c-${req.receiverId}`]}
									onClick={() => handleCancel(req.receiverId)}
								>
									Cancel
								</Button>
							</div>
						))}
					</div>
				</section>
			)}
		</div>
	);
};

export default Requests;
