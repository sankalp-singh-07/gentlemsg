import { combineReducers } from '@reduxjs/toolkit';
import { userReducer } from './user/user.reducer';
import { friendDataReducer } from './friends/friends.reducer';

export const rootReducer = combineReducers({
	user: userReducer,
	friendData: friendDataReducer,
});
