import { useEffect, useState } from 'react';
import {
	presenceHub,
	type ConnectionStatus,
} from '@/shared/ws/presenceHub';
import { WifiOff } from 'lucide-react';

const GRACE_MS = 4000;

/**
 * Shows only after a grace period of offline network or closed WS
 * (avoids false "Reconnecting" on mount / StrictMode).
 */
export function ConnectionBanner() {
	const [online, setOnline] = useState(
		typeof navigator !== 'undefined' ? navigator.onLine : true
	);
	const [wsStatus, setWsStatus] = useState<ConnectionStatus>(
		presenceHub.status
	);
	const [show, setShow] = useState(false);

	useEffect(() => {
		const on = () => setOnline(true);
		const off = () => setOnline(false);
		window.addEventListener('online', on);
		window.addEventListener('offline', off);
		const unsub = presenceHub.onStatus(setWsStatus);
		return () => {
			window.removeEventListener('online', on);
			window.removeEventListener('offline', off);
			unsub();
		};
	}, []);

	useEffect(() => {
		const problem =
			!online || wsStatus === 'connecting' || wsStatus === 'closed';

		if (!problem) {
			setShow(false);
			return;
		}

		const t = setTimeout(() => {
			const status = presenceHub.status;
			const netOnline = navigator.onLine;
			if (!netOnline) {
				setShow(true);
			} else if (status === 'connecting' || status === 'closed') {
				setShow(true);
			} else {
				setShow(false);
			}
		}, GRACE_MS);

		return () => clearTimeout(t);
	}, [online, wsStatus]);

	if (!show) return null;

	return (
		<div
			className="fixed top-0 left-0 right-0 z-[80] bg-amber-500 text-black text-sm py-1.5 px-3 flex items-center justify-center gap-2 shadow"
			role="status"
		>
			<WifiOff size={14} />
			{!online
				? 'You are offline. Messages will send when reconnected.'
				: 'Reconnecting to real-time service…'}
		</div>
	);
}
