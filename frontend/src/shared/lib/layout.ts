/** Match Tailwind `md` (768px). Below this: one pane (list or conversation). */
export const MOBILE_MAX_PX = 767;

export function isMobileLayout(): boolean {
	if (typeof window === 'undefined') return false;
	return window.matchMedia(`(max-width: ${MOBILE_MAX_PX}px)`).matches;
}
