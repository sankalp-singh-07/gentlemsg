import { getToken } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = API_URL.replace(/^http/, 'ws');

/**
 * Create a WebSocket connection to a chat room.
 * Messages are received in real-time; sending is done via REST API.
 */
export const connectChat = (chatId, onMessage) => {
	const token = getToken();
	if (!token) return null;

	const ws = new WebSocket(`${WS_URL}/ws/chat/${chatId}?token=${token}`);
	let pingInterval = null;

	ws.onopen = () => {
		console.log(`[WS] Chat connected: ${chatId}`);
		// Keepalive ping every 30 seconds
		pingInterval = setInterval(() => {
			if (ws.readyState === WebSocket.OPEN) {
				ws.send('ping');
			}
		}, 30000);
	};

	ws.onmessage = (event) => {
		if (event.data === 'pong') return; // Ignore keepalive responses
		try {
			const data = JSON.parse(event.data);
			onMessage(data);
		} catch (e) {
			console.error('[WS] Failed to parse message:', e);
		}
	};

	ws.onclose = (event) => {
		console.log(`[WS] Chat disconnected: ${chatId}`, event.code);
		if (pingInterval) clearInterval(pingInterval);
	};

	ws.onerror = (error) => {
		console.error(`[WS] Chat error:`, error);
	};

	return ws;
};

/**
 * Create a WebSocket connection for user presence.
 * Backend automatically sets online/offline status.
 * Also receives real-time notifications (friend requests, etc.)
 */
export const connectPresence = (userId, onEvent) => {
	const token = getToken();
	if (!token) return null;

	const ws = new WebSocket(`${WS_URL}/ws/presence/${userId}?token=${token}`);
	let pingInterval = null;
	let reconnectTimeout = null;

	ws.onopen = () => {
		console.log(`[WS] Presence connected: ${userId}`);
		// Clear any pending reconnect timeout on successful connection
		if (reconnectTimeout) {
			clearTimeout(reconnectTimeout);
			reconnectTimeout = null;
		}
		pingInterval = setInterval(() => {
			if (ws.readyState === WebSocket.OPEN) {
				ws.send('ping');
			}
		}, 30000);
	};

	ws.onmessage = (event) => {
		if (event.data === 'pong') return;
		try {
			const data = JSON.parse(event.data);
			if (onEvent) onEvent(data);
		} catch (e) {
			console.error('[WS] Failed to parse presence event:', e);
		}
	};

	ws.onclose = (event) => {
		console.log(`[WS] Presence disconnected: ${userId}`, event.code);
		if (pingInterval) {
			clearInterval(pingInterval);
			pingInterval = null;
		}

		// Auto-reconnect after 3 seconds (unless intentionally closed)
		if (event.code !== 1000 && event.code !== 4001) {
			reconnectTimeout = setTimeout(() => {
				console.log('[WS] Reconnecting presence...');
				connectPresence(userId, onEvent);
			}, 3000);
		}
	};

	ws.onerror = (error) => {
		console.error(`[WS] Presence error:`, error);
	};

	// Return cleanup function
	const cleanup = () => {
		if (pingInterval) {
			clearInterval(pingInterval);
			pingInterval = null;
		}
		if (reconnectTimeout) {
			clearTimeout(reconnectTimeout);
			reconnectTimeout = null;
		}
		if (ws.readyState === WebSocket.OPEN) {
			ws.close(1000);
		}
	};

	ws._cleanup = cleanup;
	return ws;
};
