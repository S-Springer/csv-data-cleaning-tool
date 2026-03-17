from slowapi import Limiter
from slowapi.util import get_remote_address

# Default client key is requester IP. In production behind proxies, use trusted headers.
limiter = Limiter(key_func=get_remote_address)
