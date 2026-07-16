/**
 * Display helpers for message content.
 * Legacy CryptoJS "encryption" is no longer used for new messages.
 * We still attempt decrypt for old ciphertext so history remains readable.
 */
import CryptoJS from 'crypto-js';

function tryDecryptLegacy(encrypted: string, userA?: string, userB?: string): string | null {
	if (!userA || !userB || !encrypted) return null;
	try {
		const [id1, id2] = [userA, userB].sort();
		const key = CryptoJS.SHA256(`${id1}-${id2}`).toString();
		const decrypted = CryptoJS.AES.decrypt(encrypted, key).toString(CryptoJS.enc.Utf8);
		return decrypted || null;
	} catch {
		return null;
	}
}

/** Prefer plain text; fall back to legacy decrypt for old messages. */
export function displayTextMessage(
	content: string,
	currentUserId?: string,
	peerId?: string
): string {
	if (!content) return '';
	// Heuristic: AES ciphertext is base64-ish without spaces and fairly long
	const looksEncrypted =
		content.length > 24 &&
		!/\s/.test(content) &&
		/^[A-Za-z0-9+/=]+$/.test(content.slice(0, 40));

	if (looksEncrypted) {
		const plain = tryDecryptLegacy(content, currentUserId, peerId);
		if (plain) return plain;
	}
	return content;
}

export function formatMessageTime(iso: string | null | undefined): string {
	if (!iso) return '';
	const date = new Date(iso);
	return new Intl.DateTimeFormat(undefined, {
		hour: '2-digit',
		minute: '2-digit',
	}).format(date);
}

export function formatDayLabel(iso: string | null | undefined): string {
	if (!iso) return '';
	const date = new Date(iso);
	const today = new Date();
	const yesterday = new Date();
	yesterday.setDate(today.getDate() - 1);

	const sameDay = (a: Date, b: Date) =>
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate();

	if (sameDay(date, today)) return 'Today';
	if (sameDay(date, yesterday)) return 'Yesterday';
	return new Intl.DateTimeFormat(undefined, {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
	}).format(date);
}

export function isSameDay(a?: string | null, b?: string | null): boolean {
	if (!a || !b) return false;
	const da = new Date(a);
	const db = new Date(b);
	return (
		da.getFullYear() === db.getFullYear() &&
		da.getMonth() === db.getMonth() &&
		da.getDate() === db.getDate()
	);
}

export function formatLastSeen(iso?: string | null, isOnline?: boolean): string {
	if (isOnline) return 'Active now';
	if (!iso) return 'Offline';
	const d = new Date(iso);
	const now = Date.now();
	const diff = now - d.getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return 'Last seen just now';
	if (mins < 60) return `Last seen ${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `Last seen ${hours}h ago`;
	return `Last seen ${formatDayLabel(iso)}`;
}
