import { useSelector } from 'react-redux';
import { friendSelector } from '../../store/friends/friends.selector';
import { useContext, useEffect } from 'react';
import { DialogContext } from '../../context/dialog.context';
import { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';

const Notifications = () => {
	const { notifs } = useSelector(friendSelector);
	const { setOpenNotifsDialog } = useContext(DialogContext);
	const [notifications, setNotifications] = useState([]);

	useEffect(() => {
		const fetchNotifications = async () => {
			const newNotifications = await Promise.all(
				notifs.map(async (notif) => {
					const { from: senderId } = notif;
					const senderRef = doc(db, 'users', senderId);
					const senderSnap = await getDoc(senderRef);

					if (senderSnap.exists()) {
						const { userName, email, photoURL } = senderSnap.data();
						return { userName, email, photoURL, ...notif };
					}
					return null;
				})
			);
			setNotifications(newNotifications.filter(Boolean));
		};

		fetchNotifications();
	}, [notifs]);

	const messageGen = (notif) => {
		if (notif.type === 'accepted') {
			return `${notif.userName} accepted your friend request`;
		} else if (notif.type === 'rejected') {
			return `${notif.userName} rejected your friend request`;
		}
	};

	const getDate = (timeStamp) => {
		const date = new Date(timeStamp);
		const options = { day: 'numeric', month: 'short' };
		return new Intl.DateTimeFormat('en-US', options).format(date);
	};

	console.log(notifications);

	return (
		<div className="bg-secondary max-md:w-11/12 max-lg:w-9/12 w-6/12 h-3/5 absolute m-auto top-0 right-0 bottom-0 left-0 shadow-md">
			<div
				className="h-full overflow-scroll p-4 grid gap-4 grid-flow-row"
				style={{ gridTemplateColumns: '1fr', gridAutoRows: 'auto' }}
			>
				{notifications.map((notif, index) => (
					<div
						key={index}
						className="flex bg-tertiary px-4 py-2 justify-between items-center gap-2 rounded-md w-full"
					>
						<div className="flex justify-self-start items-center gap-3 min-w-36 mr-3">
							<img
								src={notif.photoURL}
								alt="..."
								className="w-10 h-10 rounded-full"
							/>
							<p className="text-md text-start">
								{messageGen(notif)}
							</p>
						</div>
						<div className="flex gap-2 items-center text-end ">
							<p className="text-sm">
								{getDate(notif.createdAt)}
							</p>
							<button>X</button>
						</div>
					</div>
				))}
			</div>
			<button
				className="py-1 px-2 text-base font-semibold text-tertiary bg-black hover:bg-tertiary w-full h-9"
				onClick={() => setOpenNotifsDialog(false)}
			>
				Close
			</button>
		</div>
	);
};

export default Notifications;
