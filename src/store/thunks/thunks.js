import { createAsyncThunk } from '@reduxjs/toolkit';
import {
	doc,
	getDoc,
	updateDoc,
	arrayUnion,
	serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../utils/firebase';

export const getInitialData = createAsyncThunk(
	'friendData/getInitialData',
	async (userId) => {
		const userRef = doc(db, 'users', userId);
		const userSnap = await getDoc(userRef);

		if (userSnap.exists()) {
			const { friends, requests, blocked } = userSnap.data();
			return { friends, requests, blocked };
		} else throw new Error('User not exists');
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

			const userRequestsUpdate = userRequests.map((req) => {
				if (req.senderId === senderId && req.receiverId === userId) {
					return { ...req, status: 'accepted' };
				}
				return req;
			});

			const senderRequestsUpdate = senderRequests.map((req) => {
				if (req.senderId === senderId && req.receiverId === userId) {
					return { ...req, status: 'accepted' };
				}
				return req;
			});

			await updateDoc(userRef, {
				friends: arrayUnion(senderId),
				requests: userRequestsUpdate,
			});

			await updateDoc(senderRef, {
				friends: arrayUnion(userId),
				requests: senderRequestsUpdate,
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

			const userRequestsUpdate = userRequests.map((req) => {
				if (req.senderId === senderId && req.receiverId === userId) {
					return { ...req, status: 'rejected' };
				}
				return req;
			});

			const senderRequestsUpdate = senderRequests.map((req) => {
				if (req.senderId === senderId && req.receiverId === userId) {
					return { ...req, status: 'rejected' };
				}
				return req;
			});

			await updateDoc(userRef, {
				friends: arrayUnion(senderId),
				requests: userRequestsUpdate,
			});

			await updateDoc(senderRef, {
				friends: arrayUnion(userId),
				requests: senderRequestsUpdate,
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
