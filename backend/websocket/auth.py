"""WebSocket authentication helpers.

Starlette rejects unaccepted sockets with HTTP 403 and browsers report close
code 1006 — so always accept first, then close with an app-level code the
client can handle (4001 = auth, 4003 = forbidden).
"""

from typing import Optional

from fastapi import WebSocket

from core.security import verify_ws_token


async def authenticate_websocket(
    websocket: WebSocket,
    token: Optional[str],
    *,
    expected_user_id: Optional[str] = None,
) -> Optional[dict]:
    """Accept the socket, validate JWT, return user dict or None after close."""
    await websocket.accept()

    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return None

    user = verify_ws_token(token)
    if not user:
        await websocket.close(code=4001, reason="Invalid or expired token")
        return None

    if expected_user_id is not None and user["id"] != expected_user_id:
        await websocket.close(code=4001, reason="User mismatch")
        return None

    return user
