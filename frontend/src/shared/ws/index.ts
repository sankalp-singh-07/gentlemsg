export { connectChat, type ChatSocket, type ChatMessageHandler } from './chatClient';
export {
	connectPresence,
	attachLegacyCleanup,
	type PresenceSocket,
	type PresenceEventHandler,
} from './presenceClient';
export { connectGroup, type GroupSocket, type GroupMessageHandler } from './groupClient';

