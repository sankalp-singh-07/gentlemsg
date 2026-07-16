import { useEffect, useState } from 'react';
import { presenceHub } from '@/shared/ws/presenceHub';
import { WifiOff } from 'lucide-react';

/** Shows when offline or presence WS disconnected. */
export function ConnectionBanner() {
	const [online, setOnline] = useState(
		typeof navigator !== 'undefined' ? navigator.onLine : true
	);
	const [wsOk, setWsOk] = useState(true);

	useEffect(() => {
		const on = () => setOnline(true);
		const off = () => setOnline(false);
		window.addEventListener('online', on);
		window.addEventListener('offline', off);
		const id = setInterval(() => {
			setWsOk(presenceHub.isConnected || !online);
		}, 2000);
		return () => {
			window.removeEventListener('online', on);
			window.removeEventListener('offline', off);
			clearInterval(id);
		};
	}, [online]);

	if (online && wsOk) return null;

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
