import { createSlice } from '@reduxjs/toolkit';

const INITIAL_STATE = {
	currentUser: null,
	loading: true,
};

export const userSlice = createSlice({
	name: 'user',
	initialState: INITIAL_STATE,
	reducers: {
		setCurrentUser(state, action) {
			state.currentUser = action.payload;
			state.loading = false;
		},
		clearCurrentUser(state) {
			state.currentUser = null;
			state.loading = false;
		},
		setLoading(state, action) {
			state.loading = action.payload;
		},
	},
});

export const { setCurrentUser, clearCurrentUser, setLoading } =
	userSlice.actions;

export const userReducer = userSlice.reducer;
