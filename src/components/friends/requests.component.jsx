import { useDispatch, useSelector } from 'react-redux';
import { friendSelector } from '../../store/friends/friends.selector';
import { useEffect } from 'react';
import { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { selectCurrentUser } from '../../store/user/user.selector';
import { acceptRequest, rejectRequest } from '../../store/thunks/thunks';

const Requests = () => {
	const { requests } = useSelector(friendSelector);
	const { currentUser } = useSelector(selectCurrentUser);
	const dispatch = useDispatch();

	const [data, setData] = useState([]);
	const newData = [];
	const seen = new Set();

	const [loading, setLoading] = useState(true);

	const fetchUserData = async (userId) => {
		const userRef = doc(db, 'users', userId);
		const userSnap = await getDoc(userRef);
		if (userSnap.exists()) {
			const { name, email, photoURL } = userSnap.data();
			return { id: userId, name, email, photoURL };
		}
		return null;
	};

	useEffect(() => {
		const fetchData = async () => {
			const newData = [];

			for (const req of requests) {
				const { senderId, receiverId, status } = req;
				const uniqueKey = `${senderId}-${receiverId}`;

				if (seen.has(uniqueKey)) continue;

				const senderData = await fetchUserData(senderId);
				const receiverData = await fetchUserData(receiverId);

				if (senderData && receiverData) {
					newData.push({
						sender: { ...senderData, status },
						receiver: { ...receiverData, status },
					});
					seen.add(uniqueKey);
				}
			}
			setData(newData);
			setLoading(false);
		};

		fetchData();
	}, [requests]);

	const handleAccept = (senderId) => {
		dispatch(acceptRequest({ userId: currentUser.id, senderId }));
	};

	const handleReject = (senderId) => {
		dispatch(rejectRequest({ userId: currentUser.id, senderId }));
	};

	if (loading)
		return (
			<>
				<h1>Loading...</h1>
			</>
		);

	return (
		<div className="grid gap-4 grid-cols-1 md:grid-cols-2 mx-4 my-4">
			{data.map((el) => {
				if (
					currentUser.id === el.receiver.id &&
					el.receiver.status !== 'rejected'
				) {
					return (
						<div
							key={el.sender.id}
							className="bg-gray-100 p-4 rounded shadow-md flex flex-col items-center gap-2 justify-between"
						>
							<div className="flex flex-col items-center gap-2">
								<img
									src={el.sender.photoURL}
									alt="..."
									className="sm:w-12 sm:h-12 rounded-full w-8 h-8"
								/>
								<h1 className="text-sm text-center font-medium min-w-fit lg:text-base">
									{el.sender.name}
								</h1>
							</div>
							<div className="flex gap-2">
								<button
									onClick={() => handleAccept(el.sender.id)}
									className="bg-blue-500 text-white sm:px-2 sm:py-2 rounded hover:bg-blue-700 py-2 px-4"
								>
									<span className="md:text-sm text-xs font-semibold text-center">
										Accept
									</span>
								</button>
								<button
									onClick={() => handleReject(el.sender.id)}
									className="bg-red-500 text-white sm:px-2 sm:py-2 rounded hover:bg-red-700 py-2 px-4"
								>
									<span className="md:text-sm text-xs font-semibold text-center">
										Reject
									</span>
								</button>
							</div>
						</div>
					);
				}
				if (currentUser.id === el.sender.id) {
					return (
						<div
							className={`flex bg-quatery p-4 rounded shadow-md items-center justify-between ${
								el.receiver.status === 'rejected' &&
								'bg-slate-400'
							}`}
						>
							<div
								key={el.receiver.id}
								className="flex items-center gap-3"
							>
								<img
									src={el.receiver.photoURL}
									alt="..."
									className="w-12 h-12 rounded-full"
								/>
								<h1 className="text-sm text-center font-medium min-w-fit lg:text-base">
									{el.receiver.name}
								</h1>
							</div>
							<div className="text-end md:text-sm text-xs">
								{el.receiver.status}
							</div>
						</div>
					);
				}
				return null;
			})}
		</div>
	);
};

export default Requests;
