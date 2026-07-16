/**
 * Singleton presence WebSocket hub.
 * Shares one connection for presence + call signaling + friend events.
 */
import { getToken } from '@/shared/api/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = API_URL.replace(/^http/, 'ws');

export type PresenceHandler = (event: Record<string, unknown>) => void;

const MAX_BACKOFF_MS = 30000;
const BASE_BACKOFF_MS = 1000;

class PresenceHub {
	private ws: WebSocket | null = null;
	private userId: string | null = null;
	private handlers = new Set<PresenceHandler>();
	private pingInterval: ReturnType<typeof setInterval> | null = null;
	private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
	private intentionalClose = false;
	private attempt = 0;

	subscribe(handler: PresenceHandler): () => void {
		this.handlers.add(handler);
		return () => this.handlers.delete(handler);
	}

	connect(userId: string): void {
		if (this.userId === userId && this.ws?.readyState === WebSocket.OPEN) {
			return;
		}
		this.disconnect();
		this.intentionalClose = false;
		this.userId = userId;
		this.open();
	}

	disconnect(): void {
		this.intentionalClose = true;
		this.clearTimers();
		if (
			this.ws &&
			(this.ws.readyState === WebSocket.OPEN ||
				this.ws.readyState === WebSocket.CONNECTING)
		) {
			this.ws.close(1000);
		}
		this.ws = null;
		this.userId = null;
		this.attempt = 0;
	}

	/** Send a call-signaling or custom message through presence WS */
	send(payload: Record<string, unknown>): boolean {
		if (this.ws?.readyState !== WebSocket.OPEN) return false;
		this.ws.send(JSON.stringify(payload));
		return true;
	}

	get isConnected(): boolean {
		return this.ws?.readyState === WebSocket.OPEN;
	}

	private clearTimers() {
		if (this.pingInterval) {
			clearInterval(this.pingInterval);
			this.pingInterval = null;
		}
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}
	}

	private emit(event: Record<string, unknown>) {
		this.handlers.forEach((h) => {
			try {
				h(event);
			} catch (e) {
				console.error('[PresenceHub] handler error', e);
			}
		});
	}

	private open() {
		if (!this.userId || this.intentionalClose) return;
		const token = getToken();
		if (!token) return;

		this.ws = new WebSocket(
			`${WS_URL}/ws/presence/${this.userId}?token=${encodeURIComponent(token)}`
		);

		this.ws.onopen = () => {
			this.attempt = 0;
			this.pingInterval = setInterval(() => {
				if (this.ws?.readyState === WebSocket.OPEN) {
					this.ws.send('ping');
				}
			}, 30000);
		};

		this.ws.onmessage = (event) => {
			if (event.data === 'pong') return;
			try {
				const data = JSON.parse(event.data) as Record<string, unknown>;
				this.emit(data);
			} catch (e) {
				console.error('[PresenceHub] parse error', e);
			}
		};

		this.ws.onclose = (event) => {
			this.clearTimers();
			this.ws = null;
			if (this.intentionalClose || event.code === 4001) return;
			const delay = Math.min(
				BASE_BACKOFF_MS * 2 ** this.attempt + Math.random() * 300,
				MAX_BACKOFF_MS
			);
			this.attempt += 1;
			this.reconnectTimeout = setTimeout(() => this.open(), delay);
		};

		this.ws.onerror = () => {
			/* onclose will reconnect */
		};
	}
}

export const presenceHub = new PresenceHub();
