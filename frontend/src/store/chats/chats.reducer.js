import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as chatService from '../../services/chatService';

const INITIAL_STATE = {
	chats: [],
	loading: true,
	error: null,
};

// Async thunk to fetch chats from API
export const fetchChats = createAsyncThunk(
	'chats/fetchChats',
	async (userId) => {
		const data = await chatService.getChats();
		return data;
	}
);

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
		// Update a single chat's last message (for WebSocket real-time updates)
		updateChatLastMessage: (state, action) => {
			const { chatId, lastMessage, type, sentAt } = action.payload;
			const chat = state.chats.find((c) => c.chatId === chatId);
			if (chat) {
				chat.lastMessage = lastMessage;
				chat.type = type;
				chat.sentAt = sentAt;
				chat.isSeen = false;
			}
		},
		// Mark a chat as read
		markChatAsRead: (state, action) => {
			const chatId = action.payload;
			const chat = state.chats.find((c) => c.chatId === chatId);
			if (chat) {
				chat.isSeen = true;
			}
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchChats.pending, (state) => {
				state.loading = true;
			})
			.addCase(fetchChats.fulfilled, (state, action) => {
				state.chats = action.payload;
				state.loading = false;
				state.error = null;
			})
			.addCase(fetchChats.rejected, (state, action) => {
				state.error = action.error.message;
				state.loading = false;
			});
	},
});

export const {
	setChats,
	setLoading,
	setError,
	updateChatLastMessage,
	markChatAsRead,
} = chatsSlice.actions;
export const chatsReducer = chatsSlice.reducer;
