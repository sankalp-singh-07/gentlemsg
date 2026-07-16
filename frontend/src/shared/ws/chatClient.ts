import { getToken } from '@/shared/api/auth';
import type { ChatWsEvent } from '@/shared/types/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = API_URL.replace(/^http/, 'ws');

export type ChatMessageHandler = (event: ChatWsEvent) => void;

export interface ChatSocket {
	close: () => void;
	sendTyping: () => void;
	readonly readyState: number;
}

/**
 * Connect to a chat room WebSocket.
 * Messages are sent via REST; WS is for server-validated events only.
 */
export function connectChat(
	chatId: string,
	onMessage: ChatMessageHandler
): ChatSocket | null {
	const token = getToken();
	if (!token) return null;

	let ws: WebSocket | null = new WebSocket(
		`${WS_URL}/ws/chat/${chatId}?token=${encodeURIComponent(token)}`
	);
	let pingInterval: ReturnType<typeof setInterval> | null = null;
	let closed = false;

	const cleanup = () => {
		if (pingInterval) {
			clearInterval(pingInterval);
			pingInterval = null;
		}
	};

	ws.onopen = () => {
		if (closed) {
			ws?.close();
			return;
		}
		pingInterval = setInterval(() => {
			if (ws?.readyState === WebSocket.OPEN) {
				ws.send('ping');
			}
		}, 30000);
	};

	ws.onmessage = (event) => {
		if (event.data === 'pong') return;
		try {
			const data = JSON.parse(event.data) as ChatWsEvent;
			onMessage(data);
		} catch (e) {
			console.error('[WS] Failed to parse chat message:', e);
		}
	};

	ws.onclose = () => {
		cleanup();
	};

	ws.onerror = (error) => {
		console.error('[WS] Chat error:', error);
	};

	return {
		get readyState() {
			return ws?.readyState ?? WebSocket.CLOSED;
		},
		close: () => {
			closed = true;
			cleanup();
			if (ws && ws.readyState === WebSocket.OPEN) {
				ws.close(1000);
			}
			ws = null;
		},
		sendTyping: () => {
			if (ws?.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ event: 'typing' }));
			}
		},
	};
}
