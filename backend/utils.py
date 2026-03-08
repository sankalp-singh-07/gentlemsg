import os
import re
from fastapi import HTTPException, UploadFile

# Allowed MIME types by category
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
ALLOWED_DOC_TYPES = {"application/pdf"}
ALL_ALLOWED_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES | ALLOWED_DOC_TYPES

# File size limits (in bytes)
MAX_IMAGE_SIZE = 5 * 1024 * 1024      # 5 MB
MAX_VIDEO_SIZE = 25 * 1024 * 1024     # 25 MB
MAX_DOC_SIZE = 10 * 1024 * 1024       # 10 MB
MAX_AVATAR_SIZE = 2 * 1024 * 1024     # 2 MB

# Allowed extensions
ALLOWED_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp",
    ".mp4", ".webm", ".mov",
    ".pdf",
}

# Filename sanitization regex
SAFE_FILENAME_RE = re.compile(r"[^a-zA-Z0-9_.\-]")


def sanitize_filename(filename: str) -> str:
    """Remove unsafe characters from filename."""
    if not filename:
        return "unnamed_file"
    name, ext = os.path.splitext(filename)
    name = SAFE_FILENAME_RE.sub("_", name)[:100]  # Truncate to 100 chars
    return f"{name}{ext.lower()}"


def _get_max_size(content_type: str) -> int:
    """Get max allowed size for a given content type."""
    if content_type in ALLOWED_IMAGE_TYPES:
        return MAX_IMAGE_SIZE
    elif content_type in ALLOWED_VIDEO_TYPES:
        return MAX_VIDEO_SIZE
    elif content_type in ALLOWED_DOC_TYPES:
        return MAX_DOC_SIZE
    return MAX_IMAGE_SIZE  # Default


async def validate_upload(file: UploadFile, max_size: int | None = None) -> bytes:
    """Validate an uploaded file's type, extension, and size.

    Returns the file content bytes on success, raises HTTPException on failure.
    """
    # Check content type
    content_type = file.content_type or ""
    if content_type not in ALL_ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{content_type}' is not allowed. "
                   f"Allowed types: images (jpg, png, gif, webp), videos (mp4, webm, mov), documents (pdf).",
        )

    # Check extension
    if file.filename:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File extension '{ext}' is not allowed.",
            )

    # Read and check size
    content = await file.read()
    size_limit = max_size or _get_max_size(content_type)

    if len(content) > size_limit:
        size_mb = size_limit / (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {size_mb:.0f} MB.",
        )

    # Check file is not empty
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="File is empty.")

    return content


async def validate_avatar(file: UploadFile) -> bytes:
    """Validate a profile picture upload (images only, 2MB max)."""
    content_type = file.content_type or ""
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Profile pictures must be images (jpg, png, gif, webp).",
        )
    return await validate_upload(file, max_size=MAX_AVATAR_SIZE)
