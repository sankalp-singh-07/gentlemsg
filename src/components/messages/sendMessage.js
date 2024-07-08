import { generateKey, encryptMessage } from '../../utils/encryption';
import { generateChatId } from './userChat';
import {
	doc,
	updateDoc,
	arrayUnion,
	serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export const sendMessage = async (currentUser, receiverId, content) => {
	const chatId = generateChatId(currentUser.id, receiverId);
	const chatRef = doc(db, 'chats', chatId);

	const userChatRef = doc(db, 'userChats', currentUser.id);
	const receiverChatRef = doc(db, 'userChats', receiverId);

	const key = generateKey(currentUser.id, receiverId);
	const encryptedMessage = encryptMessage(content, key);

	const messageData = {
		message: encryptedMessage,
		senderId: currentUser.id,
		sentAt: serverTimestamp(),
		receiverId: receiverId,
	};

	await updateDoc(chatRef, {
		messages: arrayUnion(messageData),
	});

	const latestMessage = {
		lastMessage: content,
		chatId: chatId,
		isSeen: false,
		sentAt: serverTimestamp(),
	};

	await updateDoc(userChatRef, {
		chats: arrayUnion(latestMessage),
	});

	await updateDoc(receiverChatRef, {
		chats: arrayUnion(latestMessage),
	});
};
