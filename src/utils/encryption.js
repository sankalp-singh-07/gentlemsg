import CryptoJS from 'crypto-js';

export const generateKey = (user1, user2) => {
	const [id1, id2] = [user1, user2].sort();
	const key = `${id1}-${id2}`;
	return CryptoJS.SHA256(key).toString();
};

export const encryptMessage = (message, key) => {
	const messageToEncrypt = CryptoJS.enc.Utf8.parse(message);
	const encryptedMessage = CryptoJS.AES.encrypt(
		messageToEncrypt,
		key
	).toString();
	return encryptedMessage;
};

export const decryptMessage = (encryptedMessage, key) => {
	try {
		const decrypted = CryptoJS.AES.decrypt(encryptedMessage, key);
		const decryptedMessage = decrypted.toString(CryptoJS.enc.Utf8);
		if (!decryptedMessage) throw new Error('Decryption failed');
		return decryptedMessage;
	} catch (error) {
		console.error('Decryption error: ', error);
		return null;
	}
};
