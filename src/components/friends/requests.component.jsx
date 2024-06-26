import {
	doc,
	updateDoc,
	arrayUnion,
	arrayRemove,
	serverTimestamp,
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

	await updateDoc(userRef, {
		friends: arrayUnion(senderId),
		requests: arrayRemove(senderId),
	});

	await updateDoc(senderRef, {
		friends: arrayUnion(userId),
	});
};

export const rejectRequest = async (userId, senderId) => {
	const userRef = doc(db, 'users', userId);
	await updateDoc(userRef, {
		requests: arrayRemove(senderId),
	});
};
