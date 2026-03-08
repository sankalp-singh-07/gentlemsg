import api from './api';

// Get all notifications (with pagination)
export const getNotifications = async (limit = 50, offset = 0) => {
	try {
		const response = await api.get('/notifications', {
			params: { limit, offset },
		});
		return response.data;
	} catch (error) {
		console.error('Failed to fetch notifications:', error);
		throw error;
	}
};

// Delete a notification
export const deleteNotification = async (notificationId) => {
	try {
		const response = await api.delete(`/notifications/${notificationId}`);
		return response.data;
	} catch (error) {
		console.error('Failed to delete notification:', error);
		throw error;
	}
};
