import api from './api';

// Get current user's chat list (enriched with receiver profiles)
export const getChats = async () => {
	try {
		const response = await api.get('/chats/');
		return response.data;
	} catch (error) {
		console.error('Failed to fetch chats:', error);
		throw error;
	}
};

// Create a new chat with a user
export const createChat = async (receiverId) => {
	try {
		const response = await api.post('/chats/', { receiver_id: receiverId });
		return response.data;
	} catch (error) {
		console.error('Failed to create chat:', error);
		throw error;
	}
};

// Get messages in a chat (with pagination)
export const getMessages = async (chatId, limit = 50, offset = 0) => {
	try {
		const response = await api.get(`/chats/${chatId}/messages`, {
			params: { limit, offset },
		});
		return response.data;
	} catch (error) {
		console.error('Failed to fetch messages:', error);
		throw error;
	}
};

// Send a text message
export const sendMessage = async (chatId, content, type = 'text') => {
	try {
		const response = await api.post(`/chats/${chatId}/messages`, {
			content,
			type,
		});
		return response.data;
	} catch (error) {
		console.error('Failed to send message:', error);
		throw error;
	}
};

// Delete a message
export const deleteMessage = async (chatId, messageId) => {
	try {
		const response = await api.delete(
			`/chats/${chatId}/messages/${messageId}`
		);
		return response.data;
	} catch (error) {
		console.error('Failed to delete message:', error);
		throw error;
	}
};

// Mark chat as read
export const markAsRead = async (chatId) => {
	try {
		const response = await api.put(`/chats/${chatId}/read`);
		return response.data;
	} catch (error) {
		console.error('Failed to mark chat as read:', error);
		throw error;
	}
};

// Upload media file
export const uploadMedia = async (chatId, file) => {
	try {
		const formData = new FormData();
		formData.append('file', file);
		const response = await api.post(`/chats/${chatId}/media`, formData, {
			headers: { 'Content-Type': 'multipart/form-data' },
		});
		return response.data;
	} catch (error) {
		console.error('Failed to upload media:', error);
		throw error;
	}
};

// Get shared media list
export const getMedia = async (chatId) => {
	try {
		const response = await api.get(`/chats/${chatId}/media`);
		return response.data;
	} catch (error) {
		console.error('Failed to fetch media:', error);
		throw error;
	}
};

// Send typing indicator
export const sendTypingIndicator = async (chatId) => {
	try {
		const response = await api.post(`/chats/${chatId}/typing`);
		return response.data;
	} catch (error) {
		// Non-critical, don't throw
		console.warn('Typing indicator failed:', error);
	}
};
