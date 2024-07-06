import { createSlice } from '@reduxjs/toolkit';
import {
	sendRequests,
	acceptRequest,
	rejectRequest,
	getInitialData,
} from '../thunks/thunks';

const INITIAL_STATE = {
	friends: [],
	requests: [],
	blocked: [],
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
				state.requests.push(action.payload.ref);
			})
			.addCase(sendRequests.rejected, (state, action) => {
				state.status = 'failed';
				state.error = action.error.message;
				console.log('Failed to send request:', action);
			})
			.addCase(acceptRequest.fulfilled, (state, action) => {
				state.friends.push(action.payload.senderId);
				state.requests = action.payload.userRequestsUpdate;
			})
			.addCase(rejectRequest.fulfilled, (state, action) => {
				state.requests = action.payload.userRequestsUpdate;
			});
	},
});

export const { updateFriendData } = friendDataSlice.actions;
export const friendDataReducer = friendDataSlice.reducer;
