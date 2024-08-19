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
		if (Array.isArray(content)) {
			encryptedContent = content.map((url) => url);
		} else {
			encryptedContent = content;
		}
	} else {
		error('Invalid type');
	}

	if (
		!encryptedContent ||
		(Array.isArray(encryptedContent) &&
			encryptedContent.includes(undefined))
	) {
		throw new Error('Encryption failed, resulting in undefined content');
	}

	const messageData = {
		message: encryptedContent,
		senderId: currentUser.id,
		sentAt: Date.now(),
		receiverId: receiverId,
		type: type,
	};

	if (Object.values(messageData).some((value) => value === undefined)) {
		throw new Error('Message data contains undefined values');
	}

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

	if (Object.values(latestMessage).some((value) => value === undefined)) {
		throw new Error('Latest message contains undefined values');
	}

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
