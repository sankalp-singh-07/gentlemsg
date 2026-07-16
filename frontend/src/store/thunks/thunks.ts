import { createAsyncThunk } from '@reduxjs/toolkit';
import { updateFriendData } from '../friends/friends.reducer';
import * as friendService from '@/shared/api/friends';
import * as notificationService from '@/shared/api/notifications';

export const getInitialData = createAsyncThunk(
	'friendData/getInitialData',
	async (userId: string, { dispatch }) => {
		void userId;
		const [friends, requests, blocked, notifs] = await Promise.all([
			friendService.getFriends(),
			friendService.getRequests(),
			friendService.getBlocked(),
			notificationService.getNotifications(),
		]);

		dispatch(updateFriendData({ friends, requests, blocked, notifs }));
	}
);

export const sendRequests = createAsyncThunk(
	'friendData/sendRequests',
	async ({
		senderId,
		receiverId,
	}: {
		senderId: string;
		receiverId: string;
	}) => {
		void senderId;
		return friendService.sendRequest(receiverId);
	}
);

export const acceptRequest = createAsyncThunk(
	'friendData/acceptRequest',
	async ({ userId, senderId }: { userId: string; senderId: string }) => {
		const result = await friendService.acceptRequest(senderId);
		return { ...result, userId, senderId };
	}
);

export const rejectRequest = createAsyncThunk(
	'friendData/rejectRequest',
	async ({ userId, senderId }: { userId: string; senderId: string }) => {
		const result = await friendService.rejectRequest(senderId);
		return { ...result, userId, senderId };
	}
);
