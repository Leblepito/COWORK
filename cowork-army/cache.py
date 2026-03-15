"""In-memory TTL cache for COWORK.ARMY."""
from typing import Any, Optional, Callable
from functools import wraps
from cachetools import TTLCache
import structlog

logger = structlog.get_logger()


class AppCache:
    def __init__(self, maxsize: int = 1000) -> None:
        self._stores: dict[str, TTLCache] = {}
        self._maxsize = maxsize

    def _get_store(self, ttl: float) -> TTLCache:
        key = str(ttl)
        if key not in self._stores:
            self._stores[key] = TTLCache(maxsize=self._maxsize, ttl=ttl)
        return self._stores[key]

    def set(self, key: str, value: Any, ttl: float = 60) -> None:
        store = self._get_store(ttl)
        store[key] = value

    def get(self, key: str) -> Optional[Any]:
        for store in self._stores.values():
            if key in store:
                return store[key]
        return None

    def delete(self, key: str) -> None:
        for store in self._stores.values():
            store.pop(key, None)

    def clear(self) -> None:
        for store in self._stores.values():
            store.clear()


app_cache = AppCache()


def cached(key_prefix: str, ttl: float = 60) -> Callable:
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_key = f"{key_prefix}:{hash((args, tuple(sorted(kwargs.items()))))}"
            result = app_cache.get(cache_key)
            if result is not None:
                return result
            result = func(*args, **kwargs)
            app_cache.set(cache_key, result, ttl=ttl)
            return result
        return wrapper
    return decorator
