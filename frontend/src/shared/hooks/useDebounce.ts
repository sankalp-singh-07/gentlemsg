import { useEffect, useState } from 'react';

/**
 * Debounce a value by `delay` ms. Useful for search inputs.
 */
export function useDebounce<T>(value: T, delay = 300): T {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const id = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(id);
	}, [value, delay]);

	return debounced;
}
