import api from './client';
import type {
	Chat,
	ChatListItem,
	ChatMessage,
	MediaUploadResult,
	MessagesResponse,
	MessageType,
} from '@/shared/types/api';

export const getChats = async (): Promise<ChatListItem[]> => {
	const response = await api.get<ChatListItem[]>('/chats/');
	return response.data;
};

export const getChat = async (chatId: string): Promise<Chat> => {
	const response = await api.get<Chat>(`/chats/${chatId}`);
	return response.data;
};

export const createChat = async (
	receiverId: string
): Promise<{ id: string; user1_id: string; user2_id: string }> => {
	const response = await api.post('/chats/', { receiver_id: receiverId });
	return response.data;
};

export const getMessages = async (
	chatId: string,
	limit = 50,
	offset = 0
): Promise<MessagesResponse> => {
	const response = await api.get<MessagesResponse>(`/chats/${chatId}/messages`, {
		params: { limit, offset },
	});
	return response.data;
};

export const sendMessage = async (
	chatId: string,
	content: string,
	type: MessageType | string = 'text'
): Promise<ChatMessage & { event?: string }> => {
	const response = await api.post(`/chats/${chatId}/messages`, {
		content,
		type,
	});
	return response.data;
};

export const deleteMessage = async (
	chatId: string,
	messageId: string
): Promise<{ message: string }> => {
	const response = await api.delete(`/chats/${chatId}/messages/${messageId}`);
	return response.data;
};

export const markAsRead = async (chatId: string): Promise<{ message: string }> => {
	const response = await api.put(`/chats/${chatId}/read`);
	return response.data;
};

export const uploadMedia = async (
	chatId: string,
	file: File
): Promise<MediaUploadResult> => {
	const formData = new FormData();
	formData.append('file', file);
	const response = await api.post<MediaUploadResult>(
		`/chats/${chatId}/media`,
		formData,
		{ headers: { 'Content-Type': 'multipart/form-data' } }
	);
	return response.data;
};

export const getMedia = async (
	chatId: string
): Promise<Array<{ url: string; contentType: string; filename: string }>> => {
	const response = await api.get(`/chats/${chatId}/media`);
	return response.data;
};

export const sendTypingIndicator = async (chatId: string): Promise<void> => {
	try {
		await api.post(`/chats/${chatId}/typing`);
	} catch (error) {
		console.warn('Typing indicator failed:', error);
	}
};
