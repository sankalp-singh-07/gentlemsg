import api from './api';

// Get friends list (with full profiles)
export const getFriends = async () => {
	try {
		const response = await api.get('/friends/');
		return response.data;
	} catch (error) {
		console.error('Failed to fetch friends:', error);
		throw error;
	}
};

// Unfriend a user
export const unfriend = async (friendId) => {
	try {
		const response = await api.delete(`/friends/${friendId}`);
		return response.data;
	} catch (error) {
		console.error('Failed to unfriend:', error);
		throw error;
	}
};

// Get pending friend requests
export const getRequests = async () => {
	try {
		const response = await api.get('/friends/requests');
		return response.data;
	} catch (error) {
		console.error('Failed to fetch requests:', error);
		throw error;
	}
};

// Send a friend request
export const sendRequest = async (receiverId) => {
	try {
		const response = await api.post('/friends/requests', {
			receiver_id: receiverId,
		});
		return response.data;
	} catch (error) {
		console.error('Failed to send request:', error);
		throw error;
	}
};

// Accept a friend request
export const acceptRequest = async (senderId) => {
	try {
		const response = await api.post(`/friends/requests/${senderId}/accept`);
		return response.data;
	} catch (error) {
		console.error('Failed to accept request:', error);
		throw error;
	}
};

// Reject a friend request
export const rejectRequest = async (senderId) => {
	try {
		const response = await api.post(`/friends/requests/${senderId}/reject`);
		return response.data;
	} catch (error) {
		console.error('Failed to reject request:', error);
		throw error;
	}
};

// Cancel a pending request you sent
export const cancelRequest = async (receiverId) => {
	try {
		const response = await api.delete(`/friends/requests/${receiverId}`);
		return response.data;
	} catch (error) {
		console.error('Failed to cancel request:', error);
		throw error;
	}
};

// Block a user in a chat
export const blockUser = async (chatId) => {
	try {
		const response = await api.post(`/friends/block/${chatId}`);
		return response.data;
	} catch (error) {
		console.error('Failed to block user:', error);
		throw error;
	}
};

// Unblock a user in a chat
export const unblockUser = async (chatId) => {
	try {
		const response = await api.delete(`/friends/block/${chatId}`);
		return response.data;
	} catch (error) {
		console.error('Failed to unblock user:', error);
		throw error;
	}
};

// Get blocked users map
export const getBlocked = async () => {
	try {
		const response = await api.get('/friends/blocked');
		return response.data;
	} catch (error) {
		console.error('Failed to fetch blocked users:', error);
		throw error;
	}
};
