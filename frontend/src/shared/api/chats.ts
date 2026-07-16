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
	limitOrOptions: number | { limit?: number; offset?: number; beforeId?: string } = 50,
	offsetArg = 0
): Promise<MessagesResponse> => {
	const options =
		typeof limitOrOptions === 'object'
			? limitOrOptions
			: { limit: limitOrOptions, offset: offsetArg };
	const { limit = 50, offset = 0, beforeId } = options;
	const response = await api.get<MessagesResponse>(`/chats/${chatId}/messages`, {
		params: {
			limit,
			offset: beforeId ? undefined : offset,
			before_id: beforeId,
		},
	});
	return response.data;
};

export const searchChatMessages = async (
	chatId: string,
	q: string,
	limit = 50
): Promise<{ messages: ChatMessage[]; query: string }> => {
	const response = await api.get(`/chats/${chatId}/messages/search`, {
		params: { q, limit },
	});
	return response.data;
};

export const sendMessage = async (
	chatId: string,
	content: string,
	type: MessageType | string = 'text',
	replyToId?: string | null
): Promise<ChatMessage & { event?: string }> => {
	const response = await api.post(`/chats/${chatId}/messages`, {
		content,
		type,
		reply_to_id: replyToId || undefined,
	});
	return response.data;
};

export const editMessage = async (
	chatId: string,
	messageId: string,
	content: string
): Promise<ChatMessage & { event?: string }> => {
	const response = await api.patch(`/chats/${chatId}/messages/${messageId}`, {
		content,
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

export const markAsRead = async (
	chatId: string,
	lastMessageId?: string | null
): Promise<{ message: string; lastReadMessageId?: string }> => {
	const response = await api.put(`/chats/${chatId}/read`, null, {
		params: lastMessageId ? { last_message_id: lastMessageId } : undefined,
	});
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
