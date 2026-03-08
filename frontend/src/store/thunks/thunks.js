import { createAsyncThunk } from '@reduxjs/toolkit';
import { updateFriendData } from '../friends/friends.reducer';
import * as friendService from '../../services/friendService';
import * as notificationService from '../../services/notificationService';

// Fetch all friend data from API (friends, requests, blocked, notifications)
export const getInitialData = createAsyncThunk(
	'friendData/getInitialData',
	async (userId, { dispatch }) => {
		const [friends, requests, blocked, notifs] = await Promise.all([
			friendService.getFriends(),
			friendService.getRequests(),
			friendService.getBlocked(),
			notificationService.getNotifications(),
		]);

		dispatch(updateFriendData({ friends, requests, blocked, notifs }));
	}
);

// Send friend request via API
export const sendRequests = createAsyncThunk(
	'friendData/sendRequests',
	async ({ senderId, receiverId }) => {
		const result = await friendService.sendRequest(receiverId);
		return result;
	}
);

// Accept friend request via API
export const acceptRequest = createAsyncThunk(
	'friendData/acceptRequest',
	async ({ userId, senderId }) => {
		const result = await friendService.acceptRequest(senderId);
		return { ...result, userId, senderId };
	}
);

// Reject friend request via API
export const rejectRequest = createAsyncThunk(
	'friendData/rejectRequest',
	async ({ userId, senderId }) => {
		const result = await friendService.rejectRequest(senderId);
		return { ...result, userId, senderId };
	}
);
