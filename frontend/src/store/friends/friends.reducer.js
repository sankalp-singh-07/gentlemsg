import { createSlice } from '@reduxjs/toolkit';
import {
	sendRequests,
	acceptRequest,
	rejectRequest,
	getInitialData,
} from '../thunks/thunks';

const INITIAL_STATE = {
	friends: [],    // Array of friend profile objects
	requests: [],   // Array of request objects with sender/receiver profiles
	blocked: {},    // Map of chatId -> { blockedUser, blockedBy }
	notifs: [],     // Array of notification objects with sender profiles
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
				// API returns the full request object
				state.requests.push(action.payload);
			})
			.addCase(sendRequests.rejected, (state, action) => {
				state.status = 'failed';
				state.error = action.error.message;
			})
			.addCase(acceptRequest.fulfilled, (state, action) => {
				// Remove the accepted request and add to friends
				state.requests = state.requests.filter(
					(req) => !(req.senderId === action.payload.senderId)
				);
				// Add friend (will be refreshed on next getInitialData)
				state.friends.push({ id: action.payload.senderId });
			})
			.addCase(rejectRequest.fulfilled, (state, action) => {
				// Remove the rejected request
				state.requests = state.requests.filter(
					(req) => !(req.senderId === action.payload.senderId)
				);
			});
	},
});

export const { updateFriendData } = friendDataSlice.actions;
export const friendDataReducer = friendDataSlice.reducer;
