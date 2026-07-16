import { getToken } from '@/shared/api/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = API_URL.replace(/^http/, 'ws');

export type GroupMessageHandler = (event: Record<string, unknown>) => void;

export interface GroupSocket {
	close: () => void;
	sendTyping: () => void;
	readonly readyState: number;
}

export function connectGroup(
	groupId: string,
	onMessage: GroupMessageHandler
): GroupSocket | null {
	const token = getToken();
	if (!token) return null;

	let ws: WebSocket | null = new WebSocket(
		`${WS_URL}/ws/group/${groupId}?token=${encodeURIComponent(token)}`
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
			if (ws?.readyState === WebSocket.OPEN) ws.send('ping');
		}, 30000);
	};

	ws.onmessage = (event) => {
		if (event.data === 'pong') return;
		try {
			onMessage(JSON.parse(event.data));
		} catch (e) {
			console.error('[WS] group parse error', e);
		}
	};

	ws.onclose = () => cleanup();

	return {
		get readyState() {
			return ws?.readyState ?? WebSocket.CLOSED;
		},
		close: () => {
			closed = true;
			cleanup();
			if (ws && ws.readyState === WebSocket.OPEN) ws.close(1000);
			ws = null;
		},
		sendTyping: () => {
			if (ws?.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ event: 'typing' }));
			}
		},
	};
}
