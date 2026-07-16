import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import * as chatService from '@/shared/api/chats';
import type { ChatListItem } from '@/shared/types/api';

interface ChatsState {
	chats: ChatListItem[];
	loading: boolean;
	error: string | null;
}

const INITIAL_STATE: ChatsState = {
	chats: [],
	loading: true,
	error: null,
};

/** userId optional for callers that still pass it; API uses JWT identity */
export const fetchChats = createAsyncThunk(
	'chats/fetchChats',
	async (_userId?: string) => {
		return chatService.getChats();
	}
);

const chatsSlice = createSlice({
	name: 'chats',
	initialState: INITIAL_STATE,
	reducers: {
		setChats: (state, action: PayloadAction<ChatListItem[]>) => {
			state.chats = action.payload;
		},
		setLoading: (state, action: PayloadAction<boolean>) => {
			state.loading = action.payload;
		},
		setError: (state, action: PayloadAction<string | null>) => {
			state.error = action.payload;
		},
		updateChatLastMessage: (
			state,
			action: PayloadAction<{
				chatId: string;
				lastMessage: string;
				type: string;
				sentAt: string | null;
			}>
		) => {
			const { chatId, lastMessage, type, sentAt } = action.payload;
			const chat = state.chats.find((c) => c.chatId === chatId);
			if (chat) {
				chat.lastMessage = lastMessage;
				chat.type = type as ChatListItem['type'];
				chat.sentAt = sentAt;
				chat.isSeen = false;
			}
		},
		markChatAsRead: (state, action: PayloadAction<string>) => {
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
				state.error = action.error.message ?? 'Failed to load chats';
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
