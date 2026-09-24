"""FastF1 session loading with a one-round in-memory cache (see the OOM incident in CLAUDE.md)."""
import ctypes
import gc
import sys
import threading
from typing import Any

import fastf1 as ff1

ff1.Cache.enable_cache("./cache")

# In-memory session cache — avoids re-parsing Parquet files on every request.
# Key: (year, round_num, session_type, telemetry, weather). Double-checked locking
# prevents duplicate loads when concurrent requests race for the same session.
#
# Scoped to ONE round at a time: a loaded Session (especially telemetry=True) holds
# 100s of MB of laps/telemetry DataFrames, and the host's Python allocator does not
# hand freed heap back to the OS on its own (confirmed via `free -h` before/after —
# RSS plateaus instead of shrinking). On the 916MB-usable t3.micro this box runs on,
# two cached rounds were enough to drop `available` memory to ~50MB (see DEVLOG /
# CLAUDE.md incident log, 2026-08-12) — a third would likely trigger an OOM kill.
# Loading a *new* round therefore evicts every entry for a *different* round first,
# then forces glibc to release the freed arenas immediately via malloc_trim, rather
# than waiting for a future allocation to reuse them.
_session_cache: dict[tuple, Any] = {}
_session_locks: dict[tuple, threading.Lock] = {}
_cache_registry_lock = threading.Lock()
_cache_current_round: tuple | None = None  # (year, round_num) currently kept warm


def _release_native_memory() -> None:
    """Ask glibc to return freed heap arenas to the OS. No-op off Linux/glibc."""
    if not sys.platform.startswith("linux"):
        return
    try:
        ctypes.CDLL(None).malloc_trim(0)
    except (OSError, AttributeError):
        pass


def _load_session(year: int, round_num: int, session_type: str,
                  telemetry: bool = False, weather: bool = False) -> Any:
    global _cache_current_round
    key = (year, round_num, session_type, telemetry, weather)
    if key in _session_cache:
        return _session_cache[key]
    with _cache_registry_lock:
        if key not in _session_locks:
            _session_locks[key] = threading.Lock()
        lock = _session_locks[key]
    with lock:
        if key in _session_cache:
            return _session_cache[key]
        with _cache_registry_lock:
            if _cache_current_round != (year, round_num):
                for stale_key in [k for k in _session_cache if (k[0], k[1]) != (year, round_num)]:
                    del _session_cache[stale_key]
                    _session_locks.pop(stale_key, None)
                _cache_current_round = (year, round_num)
                gc.collect()
                _release_native_memory()
        session = ff1.get_session(year, round_num, session_type)
        session.load(laps=True, telemetry=telemetry, weather=weather)
        with _cache_registry_lock:
            _session_cache[key] = session
    return _session_cache[key]
