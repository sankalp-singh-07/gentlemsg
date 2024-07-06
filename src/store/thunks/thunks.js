import { createAsyncThunk } from '@reduxjs/toolkit';
import {
	doc,
	updateDoc,
	getDoc,
	onSnapshot,
	arrayUnion,
} from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { updateFriendData } from '../friends/friends.reducer';

export const getInitialData = createAsyncThunk(
	'friendData/getInitialData',
	async (userId, { dispatch }) => {
		const userRef = doc(db, 'users', userId);

		return new Promise((resolve, reject) => {
			const unsubscribe = onSnapshot(userRef, (docSnap) => {
				if (docSnap.exists()) {
					const { friends, requests, blocked, notifs } =
						docSnap.data();
					dispatch(
						updateFriendData({ friends, requests, blocked, notifs })
					);
					resolve();
				} else {
					reject(new Error('User does not exist'));
				}
			});

			return () => unsubscribe();
		});
	}
);

export const sendRequests = createAsyncThunk(
	'friendData/sendRequests',
	async ({ senderId, receiverId }) => {
		const senderRef = doc(db, 'users', senderId);
		const receiverRef = doc(db, 'users', receiverId);

		const ref = {
			senderId: senderRef.id,
			receiverId: receiverRef.id,
			status: 'pending',
			createdAt: Date.now(),
		};

		await updateDoc(senderRef, {
			requests: arrayUnion(ref),
		});

		await updateDoc(receiverRef, {
			requests: arrayUnion(ref),
		});

		return { senderId, receiverId, ref };
	}
);

export const acceptRequest = createAsyncThunk(
	'friendData/acceptRequest',
	async ({ userId, senderId }) => {
		const userRef = doc(db, 'users', userId);
		const senderRef = doc(db, 'users', senderId);

		const userSnap = await getDoc(userRef);
		const senderSnap = await getDoc(senderRef);

		if (userSnap.exists() && senderSnap.exists()) {
			const userRequests = userSnap.data().requests;
			const senderRequests = senderSnap.data().requests;

			const userRequestsUpdate = userRequests.filter((req) => {
				return !(
					req.senderId === senderId && req.receiverId === userId
				);
			});

			const senderRequestsUpdate = senderRequests.filter((req) => {
				return !(
					req.senderId === senderId && req.receiverId === userId
				);
			});

			await updateDoc(userRef, {
				friends: arrayUnion(senderId),
				requests: userRequestsUpdate,
			});

			await updateDoc(senderRef, {
				friends: arrayUnion(userId),
				requests: senderRequestsUpdate,
				notifs: arrayUnion({
					type: 'accepted',
					from: userId,
					createdAt: Date.now(),
				}),
			});

			return {
				userId,
				senderId,
				userRequestsUpdate,
				senderRequestsUpdate,
			};
		}
	}
);

export const rejectRequest = createAsyncThunk(
	'friendData/rejectRequest',
	async ({ userId, senderId }) => {
		const userRef = doc(db, 'users', userId);
		const senderRef = doc(db, 'users', senderId);

		const userSnap = await getDoc(userRef);
		const senderSnap = await getDoc(senderRef);

		if (userSnap.exists() && senderSnap.exists()) {
			const userRequests = userSnap.data().requests;
			const senderRequests = senderSnap.data().requests;

			const userRequestsUpdate = userRequests.filter((req) => {
				return !(
					req.senderId === senderId && req.receiverId === userId
				);
			});

			const senderRequestsUpdate = senderRequests.filter((req) => {
				return !(
					req.senderId === senderId && req.receiverId === userId
				);
			});

			await updateDoc(userRef, {
				requests: userRequestsUpdate,
			});

			await updateDoc(senderRef, {
				requests: senderRequestsUpdate,
				notifs: arrayUnion({
					type: 'rejected',
					from: userId,
					createdAt: Date.now(),
				}),
			});

			return {
				userId,
				senderId,
				userRequestsUpdate,
				senderRequestsUpdate,
			};
		}
	}
);
