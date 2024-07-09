import {
	arrayUnion,
	doc,
	serverTimestamp,
	writeBatch,
} from 'firebase/firestore';
import { db } from '../../utils/firebase';

export const generateChatId = (currentUserId, receiverId) =>
	[currentUserId, receiverId].sort().join('-');

export const userChat = async (currentUserId, receiverId) => {
	const chatId = generateChatId(currentUserId, receiverId);
	const userRef = doc(db, 'userChats', currentUserId);
	const receiverRef = doc(db, 'userChats', receiverId);

	const userData = {
		chats: arrayUnion({
			receiverId: receiverId,
			lastMessage: 'Start Conversation',
			chatId: chatId,
			isSeen: false,
			sentAt: Date.now(),
		}),
	};

	const receiverData = {
		chats: arrayUnion({
			receiverId: currentUserId,
			lastMessage: 'Start Conversation',
			chatId: chatId,
			isSeen: false,
			sentAt: Date.now(),
		}),
	};

	const batch = writeBatch(db);

	batch.set(userRef, userData, { merge: true });
	batch.set(receiverRef, receiverData, { merge: true });

	batch.set(doc(db, 'chats', chatId), { messages: [] });

	try {
		await batch.commit();
	} catch (error) {
		console.error('Error adding document in userChat: ', error);
	}
};
