import api from './client';
import type { ChatListItem, SearchUserResult } from '@/shared/types/api';

export interface GlobalSearchResult {
	query: string;
	users: SearchUserResult[];
	chats: Array<{
		chatId: string;
		receiverId: string;
		receiverName: string;
		receiverPhotoURL?: string;
		receiverUserName?: string;
		lastMessage?: string;
		type?: string;
		sentAt?: string | null;
	}>;
	groups: unknown[];
}

export const globalSearch = async (
	q: string,
	limit = 10
): Promise<GlobalSearchResult> => {
	const response = await api.get<GlobalSearchResult>('/search/', {
		params: { q, limit },
	});
	return response.data;
};
