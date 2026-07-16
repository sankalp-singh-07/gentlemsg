const prefix = 'gentlemsg_draft_';

export function getDraft(conversationId: string): string {
	if (!conversationId) return '';
	try {
		return localStorage.getItem(prefix + conversationId) || '';
	} catch {
		return '';
	}
}

export function setDraft(conversationId: string, text: string): void {
	if (!conversationId) return;
	try {
		if (!text.trim()) {
			localStorage.removeItem(prefix + conversationId);
		} else {
			localStorage.setItem(prefix + conversationId, text);
		}
	} catch {
		/* ignore */
	}
}

export function clearDraft(conversationId: string): void {
	if (!conversationId) return;
	try {
		localStorage.removeItem(prefix + conversationId);
	} catch {
		/* ignore */
	}
}
