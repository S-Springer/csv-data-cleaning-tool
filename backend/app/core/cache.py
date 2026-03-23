"""
Shared cache client with transparent Redis / fakeredis fallback.

Usage:
    from app.core.cache import get_cached, set_cached, invalidate_file_cache

On startup the module attempts a real Redis connection (localhost:6379).
If Redis is unavailable it silently falls back to fakeredis (in-process),
so the application works identically in dev/CI without a running Redis server.
"""

import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

_client = None  # module-level singleton


def _get_client():
    global _client
    if _client is not None:
        return _client

    try:
        import redis
        r = redis.Redis(
            host="localhost",
            port=6379,
            db=0,
            socket_connect_timeout=1,
            socket_timeout=1,
        )
        r.ping()
        logger.info("Cache: connected to Redis at localhost:6379")
        _client = r
    except Exception:
        import fakeredis
        logger.info("Cache: Redis unavailable — using in-process fakeredis fallback")
        _client = fakeredis.FakeRedis()

    return _client


def get_cached(key: str) -> Optional[Any]:
    """Return the deserialised value for *key*, or None on miss/error."""
    try:
        raw = _get_client().get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except Exception:
        return None


def set_cached(key: str, value: Any, ttl: int = 300) -> None:
    """Serialise *value* to JSON and store it under *key* with a TTL (seconds)."""
    try:
        _get_client().setex(key, ttl, json.dumps(value))
    except Exception:
        pass


def invalidate_file_cache(file_id: str) -> None:
    """Delete every cache entry associated with *file_id*."""
    try:
        client = _get_client()
        keys = client.keys(f"tidycsv:{file_id}:*")
        if keys:
            client.delete(*keys)
    except Exception:
        pass
