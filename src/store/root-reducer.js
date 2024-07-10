import { combineReducers } from '@reduxjs/toolkit';
import { userReducer } from './user/user.reducer';
import { friendDataReducer } from './friends/friends.reducer';
import { chatsReducer } from './chats/chats.reducer';

export const rootReducer = combineReducers({
	user: userReducer,
	friendData: friendDataReducer,
	chats: chatsReducer,
});
