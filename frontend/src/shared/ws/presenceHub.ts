/**
 * Singleton presence WebSocket hub.
 * Shares one connection for presence + call signaling + friend events.
 */
import { getToken } from '@/shared/api/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = API_URL.replace(/^http/, 'ws');

export type PresenceHandler = (event: Record<string, unknown>) => void;
export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'closed';

const MAX_BACKOFF_MS = 30000;
const BASE_BACKOFF_MS = 1000;

type StatusListener = (status: ConnectionStatus) => void;

class PresenceHub {
	private ws: WebSocket | null = null;
	private userId: string | null = null;
	private handlers = new Set<PresenceHandler>();
	private statusListeners = new Set<StatusListener>();
	private pingInterval: ReturnType<typeof setInterval> | null = null;
	private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
	private intentionalClose = false;
	private attempt = 0;
	private _status: ConnectionStatus = 'idle';

	get status(): ConnectionStatus {
		return this._status;
	}

	get isConnected(): boolean {
		return this.ws?.readyState === WebSocket.OPEN;
	}

	subscribe(handler: PresenceHandler): () => void {
		this.handlers.add(handler);
		return () => this.handlers.delete(handler);
	}

	/** Subscribe to connection status changes (for ConnectionBanner). */
	onStatus(listener: StatusListener): () => void {
		this.statusListeners.add(listener);
		listener(this._status);
		return () => this.statusListeners.delete(listener);
	}

	connect(userId: string): void {
		if (
			this.userId === userId &&
			(this.ws?.readyState === WebSocket.OPEN ||
				this.ws?.readyState === WebSocket.CONNECTING)
		) {
			return;
		}
		// Soft reset for reconnect without marking intentional forever
		this.clearTimers();
		if (this.ws) {
			const old = this.ws;
			this.ws = null;
			try {
				old.onclose = null;
				old.onerror = null;
				old.onmessage = null;
				old.onopen = null;
				if (
					old.readyState === WebSocket.OPEN ||
					old.readyState === WebSocket.CONNECTING
				) {
					old.close(1000);
				}
			} catch {
				/* ignore */
			}
		}
		this.intentionalClose = false;
		this.userId = userId;
		this.attempt = 0;
		this.open();
	}

	/**
	 * Full teardown (logout). Prefer unsubscribe-only on React StrictMode unmount.
	 */
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
		this.setStatus('idle');
	}

	/** Keep socket alive; only drop an event handler (StrictMode-safe). */
	unsubscribeOnly(handler: PresenceHandler): void {
		this.handlers.delete(handler);
	}

	send(payload: Record<string, unknown>): boolean {
		if (this.ws?.readyState !== WebSocket.OPEN) return false;
		this.ws.send(JSON.stringify(payload));
		return true;
	}

	private setStatus(status: ConnectionStatus) {
		if (this._status === status) return;
		this._status = status;
		this.statusListeners.forEach((l) => {
			try {
				l(status);
			} catch (e) {
				console.error('[PresenceHub] status listener error', e);
			}
		});
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
		if (!token) {
			console.warn('[PresenceHub] No auth token — cannot connect');
			this.setStatus('closed');
			return;
		}

		this.setStatus('connecting');
		const uid = this.userId;
		const ws = new WebSocket(
			`${WS_URL}/ws/presence/${uid}?token=${encodeURIComponent(token)}`
		);
		this.ws = ws;

		ws.onopen = () => {
			if (this.ws !== ws) return;
			this.attempt = 0;
			this.setStatus('open');
			this.pingInterval = setInterval(() => {
				if (this.ws?.readyState === WebSocket.OPEN) {
					this.ws.send('ping');
				}
			}, 30000);
		};

		ws.onmessage = (event) => {
			if (event.data === 'pong') return;
			try {
				const data = JSON.parse(event.data) as Record<string, unknown>;
				this.emit(data);
			} catch (e) {
				console.error('[PresenceHub] parse error', e);
			}
		};

		ws.onclose = (event) => {
			if (this.ws !== ws) return;
			this.clearTimers();
			this.ws = null;
			this.setStatus('closed');
			if (this.intentionalClose || event.code === 4001) return;
			// Re-auth failure: don't loop forever without a token
			if (!getToken() || !this.userId) return;

			const delay = Math.min(
				BASE_BACKOFF_MS * 2 ** this.attempt + Math.random() * 300,
				MAX_BACKOFF_MS
			);
			this.attempt += 1;
			this.setStatus('connecting');
			this.reconnectTimeout = setTimeout(() => this.open(), delay);
		};

		ws.onerror = () => {
			/* onclose handles reconnect */
		};
	}
}

export const presenceHub = new PresenceHub();
