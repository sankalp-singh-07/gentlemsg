import api from './client';

export interface Group {
	id: string;
	name: string;
	description?: string;
	avatarURL?: string;
	ownerId: string;
	lastMessage?: string;
	lastMessageAt?: string | null;
	createdAt?: string | null;
	memberCount?: number;
	myRole?: 'owner' | 'admin' | 'member' | string;
}

export interface GroupMember {
	userId: string;
	role: string;
	joinedAt?: string | null;
	name: string;
	userName?: string;
	photoURL?: string;
	isOnline?: boolean;
}

export interface GroupMessage {
	id: string;
	groupId?: string;
	senderId: string;
	senderName?: string;
	senderPhotoURL?: string;
	message: string;
	type: string;
	sentAt: string | null;
	replyToId?: string | null;
	editedAt?: string | null;
	status?: 'sending' | 'sent' | 'failed';
	tempId?: string;
}

export const listGroups = async (): Promise<Group[]> => {
	const res = await api.get<Group[]>('/groups/');
	return res.data;
};

export const createGroup = async (payload: {
	name: string;
	description?: string;
	member_ids?: string[];
}): Promise<Group> => {
	const res = await api.post<Group>('/groups/', payload);
	return res.data;
};

export const getGroup = async (groupId: string): Promise<Group> => {
	const res = await api.get<Group>(`/groups/${groupId}`);
	return res.data;
};

export const updateGroup = async (
	groupId: string,
	payload: { name?: string; description?: string }
): Promise<Group> => {
	const res = await api.patch<Group>(`/groups/${groupId}`, payload);
	return res.data;
};

export const deleteGroup = async (groupId: string) => {
	const res = await api.delete(`/groups/${groupId}`);
	return res.data;
};

export const listMembers = async (groupId: string): Promise<GroupMember[]> => {
	const res = await api.get<GroupMember[]>(`/groups/${groupId}/members`);
	return res.data;
};

export const addMembers = async (groupId: string, userIds: string[]) => {
	const res = await api.post(`/groups/${groupId}/members`, {
		user_ids: userIds,
	});
	return res.data;
};

export const removeMember = async (groupId: string, userId: string) => {
	const res = await api.delete(`/groups/${groupId}/members/${userId}`);
	return res.data;
};

export const leaveGroup = async (groupId: string) => {
	const res = await api.post(`/groups/${groupId}/leave`);
	return res.data;
};

export const setMemberRole = async (
	groupId: string,
	userId: string,
	role: 'admin' | 'member'
) => {
	const res = await api.patch(`/groups/${groupId}/members/${userId}/role`, {
		role,
	});
	return res.data;
};

export const getGroupMessages = async (
	groupId: string,
	options: { limit?: number; beforeId?: string } = {}
): Promise<{ messages: GroupMessage[]; hasMore?: boolean }> => {
	const { limit = 50, beforeId } = options;
	const res = await api.get(`/groups/${groupId}/messages`, {
		params: { limit, before_id: beforeId },
	});
	return res.data;
};

export const sendGroupMessage = async (
	groupId: string,
	content: string,
	type = 'text',
	replyToId?: string | null
): Promise<GroupMessage & { event?: string }> => {
	const res = await api.post(`/groups/${groupId}/messages`, {
		content,
		type,
		reply_to_id: replyToId || undefined,
	});
	return res.data;
};

export const editGroupMessage = async (
	groupId: string,
	messageId: string,
	content: string
) => {
	const res = await api.patch(`/groups/${groupId}/messages/${messageId}`, {
		content,
	});
	return res.data;
};

export const deleteGroupMessage = async (
	groupId: string,
	messageId: string
) => {
	const res = await api.delete(`/groups/${groupId}/messages/${messageId}`);
	return res.data;
};

export const sendGroupTyping = async (groupId: string) => {
	try {
		await api.post(`/groups/${groupId}/typing`);
	} catch {
		/* non-critical */
	}
};

export const uploadGroupAvatar = async (groupId: string, file: File) => {
	const form = new FormData();
	form.append('file', file);
	const res = await api.post(`/groups/${groupId}/avatar`, form, {
		headers: { 'Content-Type': 'multipart/form-data' },
	});
	return res.data;
};
