import * as chatService from '../../services/chatService';

export const generateChatId = (currentUserId, receiverId) =>
	[currentUserId, receiverId].sort().join('-');

export const userChat = async (currentUserId, receiverId) => {
	try {
		const chat = await chatService.createChat(receiverId);
		return chat;
	} catch (error) {
		console.error('Error creating chat:', error);
	}
};
