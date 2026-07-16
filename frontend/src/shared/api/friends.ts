import api from './client';
import type { BlockedMap, FriendProfile, FriendRequest } from '@/shared/types/api';

export const getFriends = async (): Promise<FriendProfile[]> => {
	const response = await api.get<FriendProfile[]>('/friends/');
	return response.data;
};

export const unfriend = async (friendId: string) => {
	const response = await api.delete(`/friends/${friendId}`);
	return response.data;
};

export const getRequests = async (): Promise<FriendRequest[]> => {
	const response = await api.get<FriendRequest[]>('/friends/requests');
	return response.data;
};

export const sendRequest = async (receiverId: string): Promise<FriendRequest> => {
	const response = await api.post<FriendRequest>('/friends/requests', {
		receiver_id: receiverId,
	});
	return response.data;
};

export const acceptRequest = async (senderId: string) => {
	const response = await api.post(`/friends/requests/${senderId}/accept`);
	return response.data;
};

export const rejectRequest = async (senderId: string) => {
	const response = await api.post(`/friends/requests/${senderId}/reject`);
	return response.data;
};

export const cancelRequest = async (receiverId: string) => {
	const response = await api.delete(`/friends/requests/${receiverId}`);
	return response.data;
};

export const blockUser = async (chatId: string) => {
	const response = await api.post(`/friends/block/${chatId}`);
	return response.data;
};

export const unblockUser = async (chatId: string) => {
	const response = await api.delete(`/friends/block/${chatId}`);
	return response.data;
};

export const getBlocked = async (): Promise<BlockedMap> => {
	const response = await api.get<BlockedMap>('/friends/blocked');
	return response.data;
};
