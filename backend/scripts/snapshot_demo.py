"""Snapshot the public API into static JSON for the frontend's offline demo mode.

When the EC2 backend is switched off, the Next.js `/api/*` route serves these files
instead, so the Vercel site keeps working with real 2026 data. Nothing here touches
Postgres — it calls the same endpoint functions the API uses, straight off FastF1.

Run from backend/ after a race weekend (or whenever the demo data should catch up):
    uv run python scripts/snapshot_demo.py            # all completed rounds
    uv run python scripts/snapshot_demo.py 14 15      # just these rounds
"""
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

os.environ.setdefault("POSTGRES_USER", "demo")
os.environ.setdefault("POSTGRES_PASSWORD", "demo")
os.environ.setdefault("POSTGRES_HOST", "localhost")
os.environ.setdefault("POSTGRES_PORT", "5432")
os.environ.setdefault("POSTGRES_DB", "demo")
os.environ.setdefault("SECRET_KEY", "demo")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import fastf1 as ff1  # noqa: E402
import pandas as pd  # noqa: E402
from fastapi import HTTPException  # noqa: E402

from app import fastf1_cache, utils  # noqa: E402
from app.routers import circuit_history, standings, telemetry  # noqa: E402

YEAR = 2026
OUT = Path(__file__).resolve().parents[2] / "frontend" / "demo-data"

TELEMETRY = {
    "race_summary": telemetry.get_race_summary,
    "tyres": telemetry.get_tyre_strategy,
    "quali": telemetry.get_quali_laptimes,
    "laptimes": telemetry.get_lap_times,
    "race_pace": telemetry.get_race_pace,
    "weather": telemetry.get_weather,
    "race_control": telemetry.get_race_control,
    "positions": telemetry.get_race_positions,
    "gaps": telemetry.get_gap_to_leader,
    "sector_times": telemetry.get_sector_times,
    "speed": telemetry.get_speed_trace,
    "map": telemetry.get_circuit_map,
}


def write(rel: str, payload) -> None:
    path = OUT / f"{rel}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, separators=(",", ":"), default=str), encoding="utf-8")


def iso(val) -> "str | None":
    dt = utils._parse_session_dt(val)
    return dt.isoformat() if dt else None


def snapshot_schedule() -> list[dict]:
    sched = ff1.get_event_schedule(YEAR)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    events = []
    for _, row in sched[sched["RoundNumber"] > 0].iterrows():
        rn = int(row["RoundNumber"])
        ev = {
            "id": rn,
            "round_number": rn,
            "event_name": row["EventName"],
            "country": row["Country"],
            "event_date": row["EventDate"].to_pydatetime().date().isoformat(),
        }
        for i in range(1, 6):
            ev[f"session{i}_name"] = utils._clean_str(row.get(f"Session{i}"))
            ev[f"session{i}_date"] = iso(row.get(f"Session{i}Date"))
        race_start = ev["session5_date"] or f"{ev['event_date']}T12:00:00"
        # A race counts as scored once it's ~3h past lights out — mirrors what an admin
        # hitting /api/score would have done by the time anyone opens the demo.
        ev["is_completed"] = (now - datetime.fromisoformat(race_start)).total_seconds() > 3 * 3600
        events.append(ev)
    write("schedule", events)
    return events


def snapshot_compare_drivers(rn: int) -> int:
    """Per-driver fastest-lap channels. The demo route pairs any two on request."""
    race = fastf1_cache._load_session(YEAR, rn, "R", telemetry=True)
    count = 0
    for code in race.results["Abbreviation"].dropna().unique():
        try:
            lap = race.laps.pick_drivers(code).pick_fastest()
            if lap is None or (hasattr(lap, "empty") and lap.empty):
                continue
            tel = lap.get_telemetry().dropna(subset=["Distance"])
            step = max(1, len(tel) // 400)
            t = tel.iloc[::step]
            lt = lap["LapTime"]
            comp = lap.get("Compound")
            team = str(lap["Team"]) if pd.notna(lap.get("Team")) else ""
            write(f"compare/{rn}/{code}", utils._clean({
                "team_slug": utils._team_slug(team),
                "lap_time": round(lt.total_seconds(), 3) if pd.notna(lt) else None,
                "compound": str(comp) if comp is not None and pd.notna(comp) else None,
                "distance": t["Distance"].round(1).tolist(),
                "time": [round(x.total_seconds(), 3) for x in t["Time"]],
                "speed": t["Speed"].round(1).tolist(),
                "throttle": t["Throttle"].round(0).tolist(),
                "brake": [int(bool(b)) for b in t["Brake"]],
                "gear": [int(g) if pd.notna(g) else None for g in t["nGear"]],
                "drs": [1 if (pd.notna(v) and int(v) in (10, 12, 14)) else 0 for v in t["DRS"]],
                "session": race.event["EventName"],
            }))
            count += 1
        except Exception as e:  # one bad driver shouldn't sink the round
            print(f"    compare {code}: {e}")
    return count


def snapshot_round(rn: int) -> None:
    t0 = time.time()
    for name, fn in TELEMETRY.items():
        try:
            write(f"telemetry/{rn}/{name}", fn(YEAR, rn))
        except HTTPException as e:
            write(f"telemetry/{rn}/{name}", {"_error": e.detail})
        except Exception as e:
            write(f"telemetry/{rn}/{name}", {"_error": str(e)})
    try:
        write(f"circuit_history/{rn}", circuit_history.get_circuit_history(YEAR, rn))
    except Exception as e:
        write(f"circuit_history/{rn}", {"_error": str(e)})
    n = snapshot_compare_drivers(rn)
    print(f"  round {rn}: done in {time.time() - t0:.0f}s ({n} compare drivers)", flush=True)


if __name__ == "__main__":
    events = snapshot_schedule()
    done = [e["round_number"] for e in events if e["is_completed"]]
    rounds = [int(a) for a in sys.argv[1:]] or done
    print(f"schedule: {len(events)} events, {len(done)} completed; snapshotting {rounds}", flush=True)
    for rn in rounds:
        snapshot_round(rn)
    # Upcoming rounds still get circuit history (dashboard shows it for the next race)
    for e in events:
        if e["round_number"] not in done:
            try:
                write(f"circuit_history/{e['round_number']}", circuit_history.get_circuit_history(YEAR, e["round_number"]))
            except Exception as ex:
                print(f"  circuit_history {e['round_number']}: {ex}")
    write(f"standings/{YEAR}", standings.get_standings(YEAR))
    print("standings: done")
