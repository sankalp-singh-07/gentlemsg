import api from './client';
import type { NotificationItem } from '@/shared/types/api';

export const getNotifications = async (
	limit = 50,
	offset = 0
): Promise<NotificationItem[]> => {
	const response = await api.get<NotificationItem[]>('/notifications', {
		params: { limit, offset },
	});
	return response.data;
};

export const deleteNotification = async (notificationId: string) => {
	const response = await api.delete(`/notifications/${notificationId}`);
	return response.data;
};
