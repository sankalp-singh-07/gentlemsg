import api from './api';

// Search users by username
export const searchUsers = async (username) => {
	try {
		const response = await api.get('/users/search', {
			params: { username },
		});
		return response.data;
	} catch (error) {
		console.error('Failed to search users:', error);
		throw error;
	}
};

// Get a user's profile
export const getUser = async (userId) => {
	try {
		const response = await api.get(`/users/${userId}`);
		return response.data;
	} catch (error) {
		console.error('Failed to fetch user:', error);
		throw error;
	}
};

// Update current user's profile (name, username)
export const updateProfile = async ({ name, user_name }) => {
	try {
		const response = await api.patch('/users/me/profile', {
			name,
			user_name,
		});
		return response.data;
	} catch (error) {
		console.error('Failed to update profile:', error);
		throw error;
	}
};

// Update online status
export const updateStatus = async (isOnline) => {
	try {
		const response = await api.patch('/users/me/status', {
			is_online: isOnline,
		});
		return response.data;
	} catch (error) {
		console.error('Failed to update status:', error);
		throw error;
	}
};

// Upload avatar
export const uploadAvatar = async (file) => {
	try {
		const formData = new FormData();
		formData.append('file', file);
		const response = await api.post('/users/me/avatar', formData, {
			headers: { 'Content-Type': 'multipart/form-data' },
		});
		return response.data;
	} catch (error) {
		console.error('Failed to upload avatar:', error);
		throw error;
	}
};

// Delete account
export const deleteAccount = async () => {
	try {
		const response = await api.delete('/users/me');
		return response.data;
	} catch (error) {
		console.error('Failed to delete account:', error);
		throw error;
	}
};

// Export user data
export const exportData = async () => {
	try {
		const response = await api.get('/users/me/export');
		return response.data;
	} catch (error) {
		console.error('Failed to export data:', error);
		throw error;
	}
};
