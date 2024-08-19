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

export const sendMessage = async (currentUser, receiverId, content, type) => {
	console.log(type);
	const chatId = generateChatId(currentUser.id, receiverId);
	const chatRef = doc(db, 'chats', chatId);

	const userChatRef = doc(db, 'userChats', currentUser.id);
	const receiverChatRef = doc(db, 'userChats', receiverId);

	const [user1, user2] = chatId.split('-');
	const key = generateKey(user1, user2);
	let encryptedContent;

	if (type === 'text') {
		encryptedContent = encryptMessage(content, key);
	} else if (type === 'image' || type === 'document' || type === 'video') {
		encryptedContent = Array.isArray(content) ? content : [content];
	} else {
		throw new Error('Invalid type');
	}

	const messageData = {
		message: encryptedContent,
		senderId: currentUser.id,
		sentAt: Date.now(),
		receiverId: receiverId,
		type: type,
	};

	await updateDoc(chatRef, {
		messages: arrayUnion(messageData),
	});

	const latestMessage = {
		lastMessage: type === 'text' ? encryptedContent : '[File]',
		chatId: chatId,
		isSeen: false,
		type: type,
		senderId: currentUser.id,
		receiverId: receiverId,
		sentAt: Date.now(),
	};

	const updateDocData = async (userChatsRef) => {
		const userChatSnap = await getDoc(userChatsRef);

		if (userChatSnap.exists()) {
			const userChatData = userChatSnap.data().chats || [];

			const updatedChats = userChatData.filter(
				(chat) => chat.chatId !== chatId
			);

			updatedChats.push(latestMessage);

			await updateDoc(userChatsRef, {
				chats: updatedChats,
			});
		} else {
			await updateDoc(userChatsRef, {
				chats: [latestMessage],
			});
		}
	};

	await Promise.all([
		updateDocData(userChatRef),
		updateDocData(receiverChatRef),
	]);
};
