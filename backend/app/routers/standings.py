"""Driver + constructor championship standings (Ergast/Jolpica), cached for 30 minutes."""
import time
from typing import Any

from fastapi import APIRouter

from app.utils import _clean, _ef, _efd, _is_finish, _team_slug

router = APIRouter()


_STANDINGS_TTL = 1800  # seconds — standings only move after a race
_standings_cache: dict[int, tuple[float, Any]] = {}


def _compute_standings(year: int):
    from fastf1.ergast import Ergast
    erg = Ergast()

    ds_content = getattr(erg.get_driver_standings(season=year), "content", None)
    if not ds_content:
        return {"_error": f"No driver standings for {year} yet"}
    ds = ds_content[0]

    cs_content = getattr(erg.get_constructor_standings(season=year), "content", None)
    cs = cs_content[0] if cs_content else None

    # Rich per-driver / per-constructor aggregation from season race results
    dagg: dict[str, dict] = {}
    cagg: dict[str, dict] = {}
    rounds_pts: dict[str, list] = {}

    def _cbucket(name):
        return cagg.setdefault(name, dict(podiums=0, onetwo=0, poles=0, fl=0))

    try:
        rr = erg.get_race_results(season=year, limit=1000)
        for race_df in (getattr(rr, "content", None) or []):
            if "constructorName" in race_df.columns:
                for cons_name, grp in race_df.groupby("constructorName"):
                    positions = [p for p in (_ef(x) for x in grp["position"]) if p is not None]
                    c = _cbucket(cons_name)
                    c["podiums"] += sum(1 for p in positions if p <= 3)
                    if 1 in positions and 2 in positions:
                        c["onetwo"] += 1
            for _, row in race_df.iterrows():
                code = row.get("driverCode") or ""
                if not code:
                    continue
                pos = _ef(row.get("position"))
                grid = _ef(row.get("grid"))
                status = str(row.get("status") or "")
                flr = _ef(row.get("fastestLapRank"))
                pts = _efd(row.get("points"), 0.0)
                cons = row.get("constructorName") or ""
                a = dagg.setdefault(code, dict(podiums=0, poles=0, fl=0, dnf=0,
                                               best=None, finishes=[], races=0, team=cons))
                a["races"] += 1
                a["team"] = cons
                if pos is not None:
                    a["finishes"].append(pos)
                    a["best"] = pos if a["best"] is None else min(a["best"], pos)
                    if pos <= 3:
                        a["podiums"] += 1
                if grid == 1:
                    a["poles"] += 1
                    _cbucket(cons)["poles"] += 1
                if flr == 1:
                    a["fl"] += 1
                    _cbucket(cons)["fl"] += 1
                if not _is_finish(status):
                    a["dnf"] += 1
                rounds_pts.setdefault(code, []).append(pts)
    except Exception:
        pass

    # Driver rows (ds already sorted by championship position)
    drivers = []
    prev_pts = None
    leader_pts = _efd(ds.iloc[0]["points"], 0.0) if len(ds) else 0.0
    for _, row in ds.iterrows():
        code = row.get("driverCode") or ""
        pts = _efd(row.get("points"), 0.0)
        a = dagg.get(code, {})
        cons_names = row.get("constructorNames")
        team = (cons_names[0] if isinstance(cons_names, (list, tuple)) and len(cons_names)
                else a.get("team") or "")
        finishes = a.get("finishes", [])
        drivers.append({
            "position": int(_efd(row.get("position"), 0)),
            "code": code,
            "driver": f"{row.get('givenName', '')} {row.get('familyName', '')}".strip(),
            "team": team,
            "team_slug": _team_slug(team),
            "points": pts,
            "wins": int(_efd(row.get("wins"), 0)),
            "podiums": a.get("podiums", 0),
            "poles": a.get("poles", 0),
            "fastest_laps": a.get("fl", 0),
            "dnfs": a.get("dnf", 0),
            "best_finish": int(a["best"]) if a.get("best") else None,
            "avg_finish": round(sum(finishes) / len(finishes), 1) if finishes else None,
            "races": a.get("races", 0),
            "points_per_race": round(pts / a["races"], 1) if a.get("races") else None,
            "last3_points": sum(rounds_pts.get(code, [])[-3:]),
            "gap_to_leader": round(leader_pts - pts),
            "gap_to_next": round(prev_pts - pts) if prev_pts is not None else 0,
        })
        prev_pts = pts

    # Constructor rows
    constructors = []
    if cs is not None:
        prev_cpts = None
        leader_cpts = _efd(cs.iloc[0]["points"], 0.0) if len(cs) else 0.0
        for _, row in cs.iterrows():
            name = row.get("constructorName") or ""
            cpts = _efd(row.get("points"), 0.0)
            c = cagg.get(name, {})
            constructors.append({
                "position": int(_efd(row.get("position"), 0)),
                "team": name,
                "team_slug": _team_slug(name),
                "points": cpts,
                "wins": int(_efd(row.get("wins"), 0)),
                "podiums": c.get("podiums", 0),
                "one_twos": c.get("onetwo", 0),
                "poles": c.get("poles", 0),
                "fastest_laps": c.get("fl", 0),
                "gap_to_leader": round(leader_cpts - cpts),
                "gap_to_next": round(prev_cpts - cpts) if prev_cpts is not None else 0,
            })
            prev_cpts = cpts

    return _clean({"year": year, "drivers": drivers, "constructors": constructors})


@router.get("/api/standings/{year}")
def get_standings(year: int):
    now = time.time()
    hit = _standings_cache.get(year)
    if hit and hit[0] > now:
        return hit[1]
    try:
        payload = _compute_standings(year)
    except Exception as e:
        return {"_error": str(e)}
    if isinstance(payload, dict) and "_error" not in payload:
        _standings_cache[year] = (now + _STANDINGS_TTL, payload)
    return payload
