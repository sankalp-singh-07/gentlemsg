import { createSlice } from '@reduxjs/toolkit';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../utils/firebase';

const INITIAL_STATE = {
	chats: [],
	loading: true,
	error: null,
};

const chatsSlice = createSlice({
	name: 'chats',
	initialState: INITIAL_STATE,
	reducers: {
		setChats: (state, action) => {
			state.chats = action.payload;
		},
		setLoading: (state, action) => {
			state.loading = action.payload;
		},
		setError: (state, action) => {
			state.error = action.payload;
		},
	},
});

export const { setChats, setLoading, setError } = chatsSlice.actions;
export const chatsReducer = chatsSlice.reducer;

export const fetchChats = (userId) => (dispatch) => {
	dispatch(setLoading(true));

	const userRef = doc(db, 'userChats', userId);

	const unsub = onSnapshot(
		userRef,
		(doc) => {
			if (doc.exists()) {
				dispatch(setChats(doc.data().chats));
			} else dispatch(setError([]));
			dispatch(setLoading(false));
		},
		(error) => {
			dispatch(setError(error.message));
			dispatch(setLoading(false));
		}
	);

	return unsub;
};
