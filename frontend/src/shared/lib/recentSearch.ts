const KEY = 'gentlemsg_recent_searches';
const MAX = 8;

export function getRecentSearches(): string[] {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
	} catch {
		return [];
	}
}

export function pushRecentSearch(term: string): string[] {
	const t = term.trim();
	if (t.length < 2) return getRecentSearches();
	const prev = getRecentSearches().filter(
		(x) => x.toLowerCase() !== t.toLowerCase()
	);
	const next = [t, ...prev].slice(0, MAX);
	localStorage.setItem(KEY, JSON.stringify(next));
	return next;
}

export function clearRecentSearches(): void {
	localStorage.removeItem(KEY);
}
