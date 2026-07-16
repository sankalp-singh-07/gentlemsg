import { useEffect, type RefObject } from 'react';

/** Close a panel when clicking outside the given element. */
export function useClickOutside<T extends HTMLElement>(
	ref: RefObject<T | null>,
	onOutside: () => void,
	enabled = true
): void {
	useEffect(() => {
		if (!enabled) return;

		const handler = (e: MouseEvent) => {
			const el = ref.current;
			if (el && !el.contains(e.target as Node)) {
				onOutside();
			}
		};

		window.addEventListener('click', handler);
		return () => window.removeEventListener('click', handler);
	}, [ref, onOutside, enabled]);
}
