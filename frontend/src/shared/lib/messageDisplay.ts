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

/** True if content looks like legacy CryptoJS AES ciphertext. */
export function looksLikeCiphertext(content: string): boolean {
	if (!content || content.length < 20) return false;
	return (
		!/\s/.test(content) &&
		/^[A-Za-z0-9+/=]+$/.test(content.slice(0, 48)) &&
		(content.startsWith('U2FsdGVkX1') || content.length > 32)
	);
}

/** Prefer plain text; fall back to legacy decrypt for old messages. */
export function displayTextMessage(
	content: string,
	currentUserId?: string,
	peerId?: string
): string {
	if (!content) return '';
	if (looksLikeCiphertext(content)) {
		const plain = tryDecryptLegacy(content, currentUserId, peerId);
		if (plain) return plain;
		// Never show raw ciphertext blobs in the UI
		return 'Message';
	}
	return content;
}

/** Sidebar / search preview for last message */
export function previewLastMessage(
	message: string | null | undefined,
	type: string | null | undefined,
	currentUserId?: string,
	peerId?: string,
	maxLen = 36
): string {
	if (!message) return 'Start conversation';
	if (type === 'image') return '📷 Image';
	if (type === 'video') return '🎬 Video';
	if (type === 'document') return '📄 Document';
	if (type === 'call') {
		try {
			const data = JSON.parse(message) as {
				status?: string;
				callType?: string;
				durationSeconds?: number;
			};
			const kind = data.callType === 'video' ? 'Video' : 'Voice';
			if (data.status === 'missed') return `Missed ${kind.toLowerCase()} call`;
			if (data.status === 'rejected') return `${kind} call declined`;
			if (data.status === 'ended' && data.durationSeconds) {
				const m = Math.floor(data.durationSeconds / 60);
				const s = data.durationSeconds % 60;
				return `${kind} call · ${m}:${String(s).padStart(2, '0')}`;
			}
			return `${kind} call`;
		} catch {
			return 'Call';
		}
	}
	const text = displayTextMessage(message, currentUserId, peerId);
	if (text.length > maxLen) return `${text.slice(0, maxLen)}…`;
	return text;
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
