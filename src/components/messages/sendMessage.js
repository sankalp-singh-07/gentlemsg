import { generateKey, encryptMessage } from '../../utils/encryption';
import { generateChatId } from './userChat';
import {
	doc,
	updateDoc,
	arrayUnion,
	getDoc,
	arrayRemove,
} from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { decryptMessage } from '../../utils/encryption';

export const sendMessage = async (currentUser, receiverId, content) => {
	const chatId = generateChatId(currentUser.id, receiverId);
	const chatRef = doc(db, 'chats', chatId);

	const userChatRef = doc(db, 'userChats', currentUser.id);
	const receiverChatRef = doc(db, 'userChats', receiverId);

	const key = generateKey(currentUser.id, receiverId);
	const encryptedMessage = encryptMessage(content, key);
	const decryptedMessage = decryptMessage(encryptedMessage, key);

	const messageData = {
		message: encryptedMessage,
		senderId: currentUser.id,
		sentAt: Date.now(),
		receiverId: receiverId,
	};

	await updateDoc(chatRef, {
		messages: arrayUnion(messageData),
	});

	const latestMessage = {
		lastMessage: decryptedMessage,
		chatId: chatId,
		isSeen: false,
		senderId: currentUser.id,
		receiverId: receiverId,
		sentAt: Date.now(),
	};

	const updateDocData = async (userChatsRef) => {
		const userChatSnap = await getDoc(userChatsRef);

		if (userChatSnap.exists()) {
			const userChatData = userChatSnap.data().chats;

			const existingChat = userChatData.find(
				(chat) => chat.chatId === chatId
			);

			if (existingChat) {
				await updateDoc(userChatsRef, {
					chats: arrayRemove(existingChat),
				});
			}
			await updateDoc(userChatsRef, {
				chats: arrayUnion(latestMessage),
			});
		} else {
			await updateDoc(userChatsRef, {
				chats: arrayUnion(latestMessage),
			});
		}
	};

	updateDocData(userChatRef);
	updateDocData(receiverChatRef);
};
