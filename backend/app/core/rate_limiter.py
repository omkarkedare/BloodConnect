"""
In-memory sliding-window rate limiter for sensitive/public endpoints.
Zero external dependencies; thread-safe for ASGI event loops.
"""
import time
from collections import defaultdict
from typing import Optional
from fastapi import Request, HTTPException, status
from app.core.config import settings


class SlidingWindowRateLimiter:
    """
    Sliding window in-memory rate limiter based on client IP.
    """
    def __init__(self, requests_per_minute: int = 60, cleanup_interval_seconds: int = 300):
        self.requests_per_minute = requests_per_minute
        self.cleanup_interval = cleanup_interval_seconds
        self.history = defaultdict(list)
        self.last_cleanup = time.time()
        self.is_enabled = True

    def _get_client_ip(self, request: Request) -> str:
        """
        Extract client IP safely.
        If behind a trusted reverse proxy (e.g., Nginx on loopback/internal socket),
        respects X-Real-IP or rightmost proxy hop in X-Forwarded-For.
        Otherwise falls back to socket host to prevent header-spoofing rate-limit bypasses.
        """
        socket_ip = request.client.host.strip() if request.client and request.client.host else ""

        # If connection is from trusted local/internal reverse proxy (loopback or testclient):
        if socket_ip in ("127.0.0.1", "::1", "localhost", "testclient", ""):
            real_ip = request.headers.get("X-Real-IP")
            if real_ip and real_ip.strip():
                return real_ip.strip()[:45]

            forwarded = request.headers.get("X-Forwarded-For")
            if forwarded:
                # Rightmost hop is the most trustworthy client IP
                hops = [h.strip() for h in forwarded.split(",") if h.strip()]
                if hops:
                    return hops[-1][:45]

        # Direct connection: use socket IP directly, bounded to prevent memory exhaustion
        if socket_ip:
            return socket_ip[:45]

        return "127.0.0.1"

    def check(self, request: Request):
        if not self.is_enabled:
            return

        now = time.time()
        client_ip = self._get_client_ip(request)

        # Periodic memory cleanup
        if now - self.last_cleanup > self.cleanup_interval:
            self._cleanup(now)

        window_start = now - 60.0
        # Filter timestamps within last 60 seconds
        recent = [t for t in self.history[client_ip] if t > window_start]
        self.history[client_ip] = recent

        limit = self.requests_per_minute
        if len(recent) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many verification requests. Please try again after 60 seconds.",
                headers={"Retry-After": "60"},
            )

        self.history[client_ip].append(now)

    def _cleanup(self, now: float):
        cutoff = now - 60.0
        expired_ips = [ip for ip, timestamps in self.history.items() if not timestamps or timestamps[-1] <= cutoff]
        for ip in expired_ips:
            self.history.pop(ip, None)
        self.last_cleanup = now

    def reset(self):
        """Reset state (primarily for automated test isolation)."""
        self.history.clear()
        self.last_cleanup = time.time()


# Singleton rate limiter instance for public certificate verification
certificate_rate_limiter = SlidingWindowRateLimiter(requests_per_minute=settings.CERTIFICATE_VERIFY_RATE_LIMIT_PER_MINUTE)


def rate_limit_certificate_verification(request: Request):
    """FastAPI dependency to rate-limit certificate verification calls."""
    certificate_rate_limiter.check(request)
