import { API_URL } from '@/shared/api/client';

/** Resolve relative upload paths to absolute API URLs. */
export function resolveMediaUrl(path: string | null | undefined): string {
	if (!path) return '';
	if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
		return path;
	}
	if (path.startsWith('/uploads')) {
		return `${API_URL}${path}`;
	}
	return path;
}
