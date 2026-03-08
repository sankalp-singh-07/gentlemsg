import { encryptMessage, generateKey } from '../../utils/encryption';
import * as chatService from '../../services/chatService';

export const generateChatId = (currentUserId, receiverId) =>
	[currentUserId, receiverId].sort().join('-');

export const sendMessage = async (currentUser, receiverId, content, type) => {
	const chatId = generateChatId(currentUser.id, receiverId);

	const [user1, user2] = chatId.split('-');
	const key = generateKey(user1, user2);

	let encryptedContent;
	if (type === 'text') {
		encryptedContent = encryptMessage(content, key);
	} else if (type === 'image' || type === 'document' || type === 'video') {
		encryptedContent = Array.isArray(content) ? content.join(',') : content;
	} else {
		throw new Error('Invalid type');
	}

	await chatService.sendMessage(chatId, encryptedContent, type);
};
