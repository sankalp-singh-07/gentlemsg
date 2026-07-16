import api from './client';
import type { SearchUserResult, User } from '@/shared/types/api';

export const searchUsers = async (username: string): Promise<SearchUserResult[]> => {
	const response = await api.get<SearchUserResult[]>('/users/search', {
		params: { username },
	});
	return response.data;
};

export const getUser = async (userId: string): Promise<User> => {
	const response = await api.get<User>(`/users/${userId}`);
	return response.data;
};

export const updateProfile = async (payload: {
	name?: string;
	user_name?: string;
}) => {
	const response = await api.patch('/users/me/profile', payload);
	return response.data;
};

export const updateStatus = async (isOnline: boolean) => {
	const response = await api.patch('/users/me/status', {
		is_online: isOnline,
	});
	return response.data;
};

export const uploadAvatar = async (file: File) => {
	const formData = new FormData();
	formData.append('file', file);
	const response = await api.post('/users/me/avatar', formData, {
		headers: { 'Content-Type': 'multipart/form-data' },
	});
	return response.data;
};

export const deleteAccount = async () => {
	const response = await api.delete('/users/me');
	return response.data;
};

export const exportData = async () => {
	const response = await api.get('/users/me/export');
	return response.data;
};
