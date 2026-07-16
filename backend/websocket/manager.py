from fastapi import WebSocket
import json


class ConnectionManager:
    """Manages WebSocket connections for real-time features."""

    def __init__(self):
        # chat_id -> list of WebSocket connections
        self.chat_connections: dict[str, list[WebSocket]] = {}
        # group_id -> list of WebSocket connections
        self.group_connections: dict[str, list[WebSocket]] = {}
        # user_id -> list of WebSocket connections (for presence/notifications)
        self.user_connections: dict[str, list[WebSocket]] = {}

    async def connect_chat(self, chat_id: str, websocket: WebSocket):
        await websocket.accept()
        if chat_id not in self.chat_connections:
            self.chat_connections[chat_id] = []
        self.chat_connections[chat_id].append(websocket)

    async def disconnect_chat(self, chat_id: str, websocket: WebSocket):
        if chat_id in self.chat_connections:
            if websocket in self.chat_connections[chat_id]:
                self.chat_connections[chat_id].remove(websocket)
            if not self.chat_connections[chat_id]:
                del self.chat_connections[chat_id]

    async def connect_group(self, group_id: str, websocket: WebSocket):
        await websocket.accept()
        if group_id not in self.group_connections:
            self.group_connections[group_id] = []
        self.group_connections[group_id].append(websocket)

    async def disconnect_group(self, group_id: str, websocket: WebSocket):
        if group_id in self.group_connections:
            if websocket in self.group_connections[group_id]:
                self.group_connections[group_id].remove(websocket)
            if not self.group_connections[group_id]:
                del self.group_connections[group_id]

    async def broadcast_to_group(self, group_id: str, message: dict):
        """Send a message to all connections in a group room."""
        if group_id not in self.group_connections:
            return
        data = json.dumps(message, default=str)
        disconnected = []
        for connection in self.group_connections[group_id]:
            try:
                await connection.send_text(data)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            if conn in self.group_connections.get(group_id, []):
                self.group_connections[group_id].remove(conn)

    async def connect_user(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.user_connections:
            self.user_connections[user_id] = []
        self.user_connections[user_id].append(websocket)

    async def disconnect_user(self, user_id: str, websocket: WebSocket):
        if user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]

    async def broadcast_to_chat(self, chat_id: str, message: dict):
        """Send a message to all connections in a chat room."""
        if chat_id in self.chat_connections:
            data = json.dumps(message, default=str)
            disconnected = []
            for connection in self.chat_connections[chat_id]:
                try:
                    await connection.send_text(data)
                except Exception:
                    disconnected.append(connection)
            for conn in disconnected:
                if conn in self.chat_connections.get(chat_id, []):
                    self.chat_connections[chat_id].remove(conn)

    async def send_to_user(self, user_id: str, message: dict):
        """Send a message to a specific user's presence connections."""
        if user_id in self.user_connections:
            data = json.dumps(message, default=str)
            disconnected = []
            for connection in self.user_connections[user_id]:
                try:
                    await connection.send_text(data)
                except Exception:
                    disconnected.append(connection)
            for conn in disconnected:
                if conn in self.user_connections.get(user_id, []):
                    self.user_connections[user_id].remove(conn)
            if user_id in self.user_connections and not self.user_connections[user_id]:
                del self.user_connections[user_id]

    async def broadcast_to_users(self, user_ids: list[str], message: dict):
        """Send a message to multiple users' presence connections."""
        for user_id in user_ids:
            await self.send_to_user(user_id, message)


# Global singleton
manager = ConnectionManager()
