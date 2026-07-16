/** Shared API DTOs matching GentleMsg backend camelCase responses */

export interface User {
	id: string;
	name: string;
	email?: string;
	photoURL?: string;
	userName?: string;
	isOnline?: boolean;
	lastActive?: string | null;
}

export interface AuthUser extends User {
	email: string;
}

export interface ChatListItem {
	chatId: string;
	receiverId: string;
	senderId: string;
	receiverName: string;
	receiverPhotoURL?: string;
	receiverUserName?: string;
	receiverIsOnline?: boolean;
	lastMessage: string;
	type: MessageType;
	sentAt: string | null;
	isSeen: boolean;
	isPinned?: boolean;
	lastReadMessageId?: string | null;
}

export interface Chat {
	id: string;
	user1_id: string;
	user2_id: string;
	last_message?: string;
	last_message_type?: string;
	last_message_at?: string;
	is_read_by_user1?: boolean;
	is_read_by_user2?: boolean;
	created_at?: string;
}

export type MessageType = 'text' | 'image' | 'video' | 'document';

export interface ReplyPreview {
	id: string;
	senderId: string;
	message: string;
	type: string;
	isDeleted?: boolean;
}

export interface MessageReaction {
	emoji: string;
	count: number;
	userIds: string[];
}

export interface ChatMessage {
	id: string;
	senderId: string;
	message: string;
	type: MessageType | string;
	sentAt: string | null;
	receiverId?: string;
	replyToId?: string | null;
	editedAt?: string | null;
	replyTo?: ReplyPreview | null;
	reactions?: MessageReaction[];
	/** Client-only status for optimistic UI */
	status?: 'sending' | 'sent' | 'failed';
	tempId?: string;
}

export interface MessagesResponse {
	messages: ChatMessage[];
	hasMore?: boolean;
	lastRead?: {
		user1: string | null;
		user2: string | null;
		user1Id: string;
		user2Id: string;
	} | null;
}

export interface FriendRequest {
	id: string;
	senderId: string;
	receiverId: string;
	status: string;
	createdAt?: string;
	senderName?: string;
	senderPhotoURL?: string;
	receiverName?: string;
	receiverPhotoURL?: string;
}

export interface FriendProfile {
	id: string;
	name: string;
	photoURL?: string;
	userName?: string;
	isOnline?: boolean;
	email?: string;
}

export interface NotificationItem {
	id: string;
	userId?: string;
	fromUserId?: string;
	type: string;
	createdAt?: string;
	senderName?: string;
	senderPhotoURL?: string;
}

export interface BlockedMap {
	[chatId: string]: {
		blockedUser: string;
		blockedBy: string;
	};
}

export interface MediaUploadResult {
	url: string;
	type: string;
	message_id: string;
	sent_at?: string | null;
}

export interface SearchUserResult {
	uid: string;
	id: string;
	name: string;
	photoURL?: string;
	userName?: string;
	email?: string;
	isOnline?: boolean;
	rank?: number;
}

/** Server → client WebSocket event envelopes */
export type PresenceEvent =
	| { event: 'friend_request'; data?: Record<string, unknown> }
	| { event: 'request_accepted'; data?: Record<string, unknown> }
	| { event: 'request_rejected'; data?: Record<string, unknown> }
	| { event: 'user_online'; userId: string }
	| { event: 'user_offline'; userId: string }
	| { event: 'user_status_changed'; userId?: string }
	| { event: 'chats_updated' }
	| { event: string; [key: string]: unknown };

export type ChatWsEvent =
	| {
			event: 'new_message';
			id: string;
			senderId: string;
			message: string;
			type: string;
			sentAt: string | null;
	  }
	| { event: 'message_deleted'; messageId: string }
	| { event: 'typing'; userId: string }
	| { event: string; [key: string]: unknown };

export interface ApiErrorBody {
	detail: string | unknown;
	code?: string;
	status?: number;
}
