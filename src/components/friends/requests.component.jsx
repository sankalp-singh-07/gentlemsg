import {
	doc,
	updateDoc,
	arrayUnion,
	arrayRemove,
	serverTimestamp,
	getDoc,
} from 'firebase/firestore';
import { db } from '../../utils/firebase';

export const sendRequest = async (senderId, receiverId) => {
	const senderRef = doc(db, 'users', senderId);
	const receiverRef = doc(db, 'users', receiverId);
	const req = {
		senderId: senderId,
		receiverId: receiverId,
		status: 'pending',
		timeStamp: serverTimestamp(),
	};
	await updateDoc(receiverRef, {
		requests: arrayUnion(req),
	});
	await updateDoc(senderRef, {
		requests: arrayUnion(req),
	});
};

export const acceptRequest = async (userId, senderId) => {
	const userRef = doc(db, 'users', userId);
	const senderRef = doc(db, 'users', senderId);

	const userDoc = await getDoc(userRef);
	const senderDoc = await getDoc(senderRef);

	if (userDoc.exists() && senderDoc.exists()) {
		const userReq = userDoc.data().requests;
		const senderReq = senderDoc.data().requests;

		const userReqUpdate = userReq.map((req) => {
			if (req.senderId === senderId && req.receiverId === userId) {
				return {
					...req,
					status: 'accepted',
				};
			}
			return req;
		});

		const senderReqUpdate = senderReq.map((req) => {
			if (req.senderId === senderId && req.receiverId === userId) {
				return {
					...req,
					status: 'accepted',
				};
			}
			return req;
		});

		await updateDoc(userRef, {
			friends: arrayUnion(senderId),
			requests: userReqUpdate,
		});

		await updateDoc(senderRef, {
			friends: arrayUnion(userId),
			requests: senderReqUpdate,
		});
	}
};

export const rejectRequest = async (userId, senderId) => {
	const userRef = doc(db, 'users', userId);
	const senderRef = doc(db, 'users', senderId);

	const userDoc = await getDoc(userRef);
	const senderDoc = await getDoc(senderRef);

	if (userDoc.exists() && senderDoc.exists()) {
		const userReq = userDoc.data().requests;
		const senderReq = senderDoc.data().requests;

		const userReqUpdate = userReq.map((req) => {
			if (req.senderId === senderId && req.receiverId === userId) {
				return {
					...req,
					status: 'rejected',
				};
			}
			return req;
		});

		const senderReqUpdate = senderReq.map((req) => {
			if (req.senderId === senderId && req.receiverId === userId) {
				return {
					...req,
					status: 'rejected',
				};
			}
			return req;
		});

		await updateDoc(userRef, {
			requests: userReqUpdate,
		});

		await updateDoc(senderRef, {
			requests: senderReqUpdate,
		});
	}
};
