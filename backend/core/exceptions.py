"""Central exception handlers for consistent API error responses."""

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("gentlemsg")


def _error_body(
    *,
    detail: str | list | dict,
    code: str,
    status_code: int,
) -> dict:
    return {
        "detail": detail,
        "code": code,
        "status": status_code,
    }


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        code = "http_error"
        if exc.status_code == 401:
            code = "unauthorized"
        elif exc.status_code == 403:
            code = "forbidden"
        elif exc.status_code == 404:
            code = "not_found"
        elif exc.status_code == 409:
            code = "conflict"
        elif exc.status_code == 429:
            code = "rate_limited"

        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(
                detail=exc.detail if exc.detail is not None else "Error",
                code=code,
                status_code=exc.status_code,
            ),
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_error_body(
                detail=exc.errors(),
                code="validation_error",
                status_code=422,
            ),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_error_body(
                detail="Internal server error",
                code="internal_error",
                status_code=500,
            ),
        )
