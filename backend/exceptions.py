"""COWORK.ARMY exception hierarchy for centralized error handling."""


class AppException(Exception):
    """Base exception for all application errors."""

    def __init__(self, status_code: int = 500, detail: str = "Internal server error") -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


class NotFoundError(AppException):
    """Resource not found."""

    def __init__(self, resource: str, identifier: str) -> None:
        super().__init__(status_code=404, detail=f"{resource} '{identifier}' not found")


class ValidationError(AppException):
    """Request validation failed."""

    def __init__(self, detail: str) -> None:
        super().__init__(status_code=422, detail=detail)


class AuthError(AppException):
    """Authentication or authorization failed."""

    def __init__(self, detail: str = "Unauthorized") -> None:
        super().__init__(status_code=401, detail=detail)
