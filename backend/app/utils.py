"""Small pure helpers shared across routers (JSON cleaning, FastF1/Ergast value coercion)."""
import math
from datetime import datetime

import pandas as pd


def _clean(obj):
    """Recursively replace NaN/inf floats with None for JSON serialization."""
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    if isinstance(obj, dict):
        return {k: _clean(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_clean(v) for v in obj]
    return obj


def _parse_session_dt(val) -> "datetime | None":
    """Convert a FastF1 Timestamp to a naive UTC datetime, or None if missing."""
    from datetime import timezone as tz
    if val is None or not pd.notna(val):
        return None
    dt = val.to_pydatetime()
    if dt.tzinfo is not None:
        dt = dt.astimezone(tz.utc).replace(tzinfo=None)
    return dt

def _clean_str(val) -> "str | None":
    s = str(val).strip() if val is not None else ""
    return s if s and s.lower() != "nan" else None


def _ef(v):
    """Coerce an Ergast cell to float, or None if missing/NaN."""
    try:
        if v is None:
            return None
        f = float(v)
        return None if math.isnan(f) else f
    except Exception:
        return None


def _efd(v, default: float) -> float:
    """Like _ef but always returns a number (default when missing)."""
    r = _ef(v)
    return default if r is None else r


def _is_finish(status: str) -> bool:
    return status == "Finished" or status.startswith("+")


def _team_slug(name: str) -> str:
    """Canonical key for a constructor — drives team colours and logo filenames."""
    n = (name or "").lower()
    if "mercedes" in n: return "mercedes"
    if "ferrari" in n: return "ferrari"
    if "mclaren" in n: return "mclaren"
    if "red bull" in n or "redbull" in n: return "redbull"
    if "alpine" in n: return "alpine"
    if "aston" in n: return "astonmartin"
    if "williams" in n: return "williams"
    if "racing bull" in n or "alphatauri" in n or n.strip() in ("rb", "rb f1 team"): return "racingbulls"
    if "haas" in n: return "haas"
    if "audi" in n or "sauber" in n: return "audi"
    if "cadillac" in n: return "cadillac"
    return n.replace(" ", "")
