import { getToken } from '@/shared/api/auth';
import type { PresenceEvent } from '@/shared/types/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = API_URL.replace(/^http/, 'ws');

export type PresenceEventHandler = (event: PresenceEvent) => void;

export interface PresenceSocket {
	/** Intentionally disconnect and stop reconnection */
	disconnect: () => void;
	readonly readyState: number;
}

const MAX_BACKOFF_MS = 30000;
const BASE_BACKOFF_MS = 1000;

/**
 * Presence WebSocket with exponential backoff reconnect.
 * Cleanup always cancels pending reconnects (fixes orphan socket bug).
 */
export function connectPresence(
	userId: string,
	onEvent?: PresenceEventHandler
): PresenceSocket | null {
	const token = getToken();
	if (!token) return null;

	let ws: WebSocket | null = null;
	let pingInterval: ReturnType<typeof setInterval> | null = null;
	let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
	let intentionalClose = false;
	let attempt = 0;
	let currentReadyState: number = WebSocket.CONNECTING;

	const clearTimers = () => {
		if (pingInterval) {
			clearInterval(pingInterval);
			pingInterval = null;
		}
		if (reconnectTimeout) {
			clearTimeout(reconnectTimeout);
			reconnectTimeout = null;
		}
	};

	const open = () => {
		if (intentionalClose) return;

		const t = getToken();
		if (!t) return;

		ws = new WebSocket(
			`${WS_URL}/ws/presence/${userId}?token=${encodeURIComponent(t)}`
		);
		currentReadyState = WebSocket.CONNECTING;

		ws.onopen = () => {
			currentReadyState = WebSocket.OPEN;
			attempt = 0;
			pingInterval = setInterval(() => {
				if (ws?.readyState === WebSocket.OPEN) {
					ws.send('ping');
				}
			}, 30000);
		};

		ws.onmessage = (event) => {
			if (event.data === 'pong') return;
			try {
				const data = JSON.parse(event.data) as PresenceEvent;
				onEvent?.(data);
			} catch (e) {
				console.error('[WS] Failed to parse presence event:', e);
			}
		};

		ws.onclose = (event) => {
			currentReadyState = WebSocket.CLOSED;
			clearTimers();
			ws = null;

			// Reconnect unless intentional or auth failure
			if (intentionalClose || event.code === 4001) return;

			const delay = Math.min(
				BASE_BACKOFF_MS * 2 ** attempt + Math.random() * 300,
				MAX_BACKOFF_MS
			);
			attempt += 1;
			reconnectTimeout = setTimeout(open, delay);
		};

		ws.onerror = (error) => {
			console.error('[WS] Presence error:', error);
		};
	};

	open();

	return {
		get readyState() {
			return ws?.readyState ?? currentReadyState;
		},
		disconnect: () => {
			intentionalClose = true;
			clearTimers();
			if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
				ws.close(1000);
			}
			ws = null;
		},
	};
}

/** @deprecated use PresenceSocket.disconnect — kept for App.jsx compat */
export function attachLegacyCleanup(socket: PresenceSocket | null) {
	if (!socket) return null;
	const wrapper = socket as PresenceSocket & { _cleanup?: () => void };
	wrapper._cleanup = () => socket.disconnect();
	return wrapper;
}
