import { createSlice } from '@reduxjs/toolkit';
import {
	sendRequests,
	acceptRequest,
	rejectRequest,
	getInitialData,
	cancelFriendRequest,
	unfriendUser,
} from '../thunks/thunks';

const INITIAL_STATE = {
	friends: [],
	requests: [],
	blocked: {},
	notifs: [],
	status: 'idle',
	error: null,
};

const friendDataSlice = createSlice({
	name: 'friendData',
	initialState: INITIAL_STATE,
	reducers: {
		updateFriendData: (state, action) => {
			const { friends, requests, blocked, notifs } = action.payload;
			state.friends = friends;
			state.blocked = blocked;
			state.requests = requests;
			state.notifs = notifs;
			state.status = 'success';
		},
		removeNotificationLocal: (state, action) => {
			state.notifs = state.notifs.filter((n) => n.id !== action.payload);
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(getInitialData.pending, (state) => {
				state.status = 'loading';
			})
			.addCase(getInitialData.rejected, (state, action) => {
				state.status = 'failed';
				state.error = action.error.message;
			})
			.addCase(sendRequests.pending, (state) => {
				state.status = 'loading';
			})
			.addCase(sendRequests.fulfilled, (state, action) => {
				state.status = 'success';
				state.requests.push(action.payload);
			})
			.addCase(sendRequests.rejected, (state, action) => {
				state.status = 'failed';
				state.error = action.error.message;
			})
			.addCase(acceptRequest.fulfilled, (state, action) => {
				state.requests = state.requests.filter(
					(req) => req.senderId !== action.payload.senderId
				);
				if (!state.friends.some((f) => f.id === action.payload.senderId)) {
					state.friends.push({ id: action.payload.senderId });
				}
			})
			.addCase(rejectRequest.fulfilled, (state, action) => {
				state.requests = state.requests.filter(
					(req) => req.senderId !== action.payload.senderId
				);
			})
			.addCase(cancelFriendRequest.fulfilled, (state, action) => {
				state.requests = state.requests.filter(
					(req) => req.receiverId !== action.payload.receiverId
				);
			})
			.addCase(unfriendUser.fulfilled, (state, action) => {
				state.friends = state.friends.filter(
					(f) => f.id !== action.payload.friendId
				);
			});
	},
});

export const { updateFriendData, removeNotificationLocal } = friendDataSlice.actions;
export const friendDataReducer = friendDataSlice.reducer;
