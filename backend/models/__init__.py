"""SQLAlchemy models — import here so Base.metadata is fully populated for Alembic."""

from models.user import User
from models.chat import Chat, Friendship
from models.message import Message
from models.friend_request import FriendRequest
from models.notification import Notification
from models.blocked_user import BlockedUser
from models.group import Group, GroupMember, GroupMessage

__all__ = [
    "User",
    "Chat",
    "Friendship",
    "Message",
    "FriendRequest",
    "Notification",
    "BlockedUser",
    "Group",
    "GroupMember",
    "GroupMessage",
]
