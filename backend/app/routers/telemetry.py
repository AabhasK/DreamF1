"""Per-race telemetry endpoints, all computed from cached FastF1 sessions."""
import re
from typing import Any

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException

from app.fastf1_cache import _load_session
from app.utils import _clean, _team_slug

router = APIRouter()


@router.get("/api/telemetry/{year}/{round_num}/speed")
def get_speed_trace(year: int, round_num: int):
    try:
        race = _load_session(year, round_num, 'R', telemetry=True)
    except Exception:
        raise HTTPException(status_code=404, detail="Session data not available yet")

    if race.results.empty:
        raise HTTPException(status_code=404, detail="No results for this session")

    top10 = race.results.iloc[:10]['Abbreviation'].tolist()
    drivers_data = {}

    for drv in top10:
        try:
            fastest = race.laps.pick_driver(drv).pick_fastest()
            tel = fastest.get_telemetry()[['Distance', 'Speed']].dropna()
            # downsample so we're not sending 5000 points per driver
            step = max(1, len(tel) // 300)
            tel = tel.iloc[::step]
            drivers_data[drv] = {
                "distance": tel['Distance'].round(1).tolist(),
                "speed": tel['Speed'].round(1).tolist()
            }
        except Exception:
            continue

    return _clean({"session": race.event['EventName'], "drivers": drivers_data})


@router.get("/api/telemetry/{year}/{round_num}/tyres")
def get_tyre_strategy(year: int, round_num: int):
    try:
        race = _load_session(year, round_num, 'R')
    except Exception:
        raise HTTPException(status_code=404, detail="Session data not available yet")

    drivers = race.results['Abbreviation'].tolist()
    stints = []

    for drv in drivers:
        laps = race.laps.pick_driver(drv)
        if laps.empty:
            continue
        for _, group in laps.groupby('Stint'):
            if group.empty:
                continue
            valid_compounds = group['Compound'].dropna()
            compound = str(valid_compounds.iloc[0]) if not valid_compounds.empty else 'UNKNOWN'
            lap_start = int(group['LapNumber'].iloc[0])
            lap_end = int(group['LapNumber'].iloc[-1])

            # Tyre age at the start of the stint (>0 means a used/scrubbed set)
            tyre_life_start = None
            if 'TyreLife' in group.columns:
                tl = group['TyreLife'].dropna()
                if not tl.empty:
                    tyre_life_start = int(tl.iloc[0])

            fresh = None
            if 'FreshTyre' in group.columns:
                ft = group['FreshTyre'].dropna()
                if not ft.empty:
                    fresh = bool(ft.iloc[0])

            stints.append({
                "driver": drv,
                "compound": compound,
                "lap_start": lap_start,
                "lap_end": lap_end,
                "laps": lap_end - lap_start + 1,
                "tyre_life_start": tyre_life_start,
                "fresh": fresh,
            })

    return _clean({"session": race.event['EventName'], "stints": stints})


@router.get("/api/telemetry/{year}/{round_num}/quali")
def get_quali_laptimes(year: int, round_num: int):
    try:
        quali = _load_session(year, round_num, 'Q')

        if quali.results is None or quali.results.empty:
            raise HTTPException(status_code=404, detail="No qualifying results available for this round")

        available_cols = quali.results.columns.tolist()
        keep = [c for c in ['Abbreviation', 'Q1', 'Q2', 'Q3'] if c in available_cols]
        if 'Abbreviation' not in keep:
            raise HTTPException(status_code=500, detail=f"Unexpected results columns: {available_cols}")

        results = quali.results[keep].copy()
        for col in ['Q1', 'Q2', 'Q3']:
            if col in results.columns:
                results[col] = results[col].apply(
                    lambda x: round(x.total_seconds(), 3) if pd.notna(x) and hasattr(x, 'total_seconds') else None
                )

        return _clean({"session": quali.event['EventName'], "results": results.to_dict(orient='records')})

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FastF1 error: {str(e)}")


@router.get("/api/telemetry/{year}/{round_num}/laptimes")
def get_lap_times(year: int, round_num: int):
    """Lap time evolution for top 5 finishers — shows pace over the race."""
    try:
        race = _load_session(year, round_num, 'R')

        if race.results is None or race.results.empty:
            raise HTTPException(status_code=404, detail="No race results available")

        all_drivers = race.results['Abbreviation'].tolist()
        drivers_data = {}

        for drv in all_drivers:
            laps = race.laps.pick_driver(drv).pick_quicklaps()
            if laps.empty:
                continue
            drivers_data[drv] = {
                "lap_numbers": laps['LapNumber'].astype(int).tolist(),
                "lap_times": laps['LapTime'].apply(
                    lambda x: round(x.total_seconds(), 3) if pd.notna(x) and hasattr(x, 'total_seconds') else None
                ).tolist(),
                "compound": laps['Compound'].fillna('UNKNOWN').tolist(),
            }

        return _clean({"session": race.event['EventName'], "drivers": drivers_data})

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FastF1 error: {str(e)}")


@router.get("/api/telemetry/{year}/{round_num}/positions")
def get_race_positions(year: int, round_num: int):
    """Position of each driver lap-by-lap throughout the race."""
    try:
        race = _load_session(year, round_num, 'R')

        if race.results is None or race.results.empty:
            raise HTTPException(status_code=404, detail="No race results available")

        all_drivers = race.results['Abbreviation'].tolist()
        drivers_data = {}

        for drv in all_drivers:
            laps = race.laps.pick_driver(drv)[['LapNumber', 'Position']].dropna()
            if laps.empty:
                continue
            drivers_data[drv] = {
                "lap_numbers": laps['LapNumber'].astype(int).tolist(),
                "positions": laps['Position'].astype(int).tolist(),
            }

        return _clean({"session": race.event['EventName'], "drivers": drivers_data})

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FastF1 error: {str(e)}")


@router.get("/api/telemetry/{year}/{round_num}/gaps")
def get_gap_to_leader(year: int, round_num: int):
    """Gap to race leader per lap for top 5 drivers."""
    try:
        race = _load_session(year, round_num, 'R')

        if race.results is None or race.results.empty:
            raise HTTPException(status_code=404, detail="No race results available")

        all_drivers = race.results['Abbreviation'].tolist()

        # Build a lap-time matrix and compute cumulative gap to leader
        leader = all_drivers[0]
        leader_laps = race.laps.pick_driver(leader).pick_quicklaps()[['LapNumber', 'LapTime']].dropna()
        leader_cumulative = leader_laps.set_index('LapNumber')['LapTime'].apply(
            lambda x: x.total_seconds() if pd.notna(x) else None
        ).dropna().cumsum()

        drivers_data = {}
        for drv in all_drivers:
            laps = race.laps.pick_driver(drv).pick_quicklaps()[['LapNumber', 'LapTime']].dropna()
            if laps.empty:
                continue
            drv_cumulative = laps.set_index('LapNumber')['LapTime'].apply(
                lambda x: x.total_seconds() if pd.notna(x) else None
            ).dropna().cumsum()

            common_laps = sorted(set(leader_cumulative.index) & set(drv_cumulative.index))
            gaps = [(drv_cumulative[lap] - leader_cumulative[lap]) for lap in common_laps]

            drivers_data[drv] = {
                "lap_numbers": common_laps,
                "gap_seconds": [round(g, 3) for g in gaps],
            }

        return _clean({"session": race.event['EventName'], "drivers": drivers_data})

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FastF1 error: {str(e)}")


@router.get("/api/telemetry/{year}/{round_num}/race_summary")
def get_race_summary(year: int, round_num: int):
    """Full classification for all drivers — avg pace, positions gained, DNF, fastest lap."""
    try:
        race = _load_session(year, round_num, 'R')

        if race.results is None or race.results.empty:
            raise HTTPException(status_code=404, detail="No race results available")

        try:
            fastest_lap_driver = race.laps.pick_fastest()['Driver']
        except Exception:
            fastest_lap_driver = None

        summary = []
        for _, row in race.results.iterrows():
            drv = row['Abbreviation']
            drv_laps = race.laps.pick_driver(drv)
            valid_times = drv_laps['LapTime'].dropna()

            avg_s = round(valid_times.mean().total_seconds(), 3) if not valid_times.empty else None
            best_s = round(valid_times.min().total_seconds(), 3) if not valid_times.empty else None
            total_laps = int(drv_laps['LapNumber'].max()) if not drv_laps.empty else 0

            grid_raw = row.get('GridPosition', None)
            finish_raw = row.get('Position', None)
            try:
                grid = int(float(grid_raw)) if grid_raw is not None and str(grid_raw) not in ('', 'nan') else None
            except Exception:
                grid = None
            try:
                finish = int(float(finish_raw)) if finish_raw is not None and str(finish_raw) not in ('', 'nan') else None
            except Exception:
                finish = None

            positions_gained = (grid - finish) if (grid and finish) else None
            status = str(row.get('Status', ''))
            # Finishers: "Finished", "+N Lap(s)" style, or "Lapped"
            is_dnf = status not in ('Finished', 'Lapped') and not status.startswith('+')

            summary.append({
                "abbreviation": drv,
                "finish_position": finish,
                "grid_position": grid,
                "positions_gained": positions_gained,
                "status": status,
                "is_dnf": is_dnf,
                "dnf_lap": total_laps if is_dnf else None,
                "points": float(row.get('Points', 0) or 0),
                "avg_lap_time": avg_s,
                "best_lap_time": best_s,
                "total_laps": total_laps,
                "fastest_lap": (drv == fastest_lap_driver),
            })

        return _clean({"session": race.event['EventName'], "results": summary})

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FastF1 error: {str(e)}")


@router.get("/api/telemetry/{year}/{round_num}/sector_times")
def get_sector_times(year: int, round_num: int):
    """Best sector times per driver from qualifying — for pole prediction."""
    try:
        quali = _load_session(year, round_num, 'Q')

        if quali.results is None or quali.results.empty:
            raise HTTPException(status_code=404, detail="No qualifying results available")

        drivers_data = {}
        for drv in quali.results['Abbreviation'].tolist():
            try:
                laps = quali.laps.pick_driver(drv).pick_quicklaps()
                if laps.empty:
                    continue

                def _sec(col):
                    if col not in laps.columns:
                        return None
                    valid = laps[col].dropna()
                    if valid.empty:
                        return None
                    val = valid.min()
                    return round(val.total_seconds(), 3) if pd.notna(val) and hasattr(val, 'total_seconds') else None

                drivers_data[drv] = {"s1": _sec('Sector1Time'), "s2": _sec('Sector2Time'), "s3": _sec('Sector3Time')}
            except Exception:
                continue

        for sec in ['s1', 's2', 's3']:
            times = {d: v[sec] for d, v in drivers_data.items() if v.get(sec) is not None}
            if times:
                best_drv = min(times, key=times.get)
                for d in drivers_data:
                    drivers_data[d][f'{sec}_best'] = (d == best_drv)

        return _clean({"session": quali.event['EventName'], "drivers": drivers_data})

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FastF1 error: {str(e)}")


@router.get("/api/telemetry/{year}/{round_num}/map")
def get_circuit_map(year: int, round_num: int):
    """Circuit outline from fastest lap GPS coordinates — X/Y in metres."""
    try:
        race = _load_session(year, round_num, 'R', telemetry=True)

        lap = race.laps.pick_fastest()
        tel = lap.get_telemetry()[['X', 'Y']].dropna()

        # Downsample to ~600 points — enough for a smooth outline
        step = max(1, len(tel) // 600)
        tel = tel.iloc[::step]

        return _clean({
            "session": race.event['EventName'],
            "x": tel['X'].round(0).tolist(),
            "y": tel['Y'].round(0).tolist(),
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FastF1 error: {str(e)}")


@router.get("/api/telemetry/{year}/{round_num}/race_pace")
def get_race_pace(year: int, round_num: int):
    """Clean-air race pace per driver: median/best, per-compound, per-stint degradation.

    Clean-air laps exclude lap 1, in/out laps, deleted (track-limits) laps, and any
    lap run under SC/VSC/red (TrackStatus containing 4/5/6/7).
    """
    try:
        race = _load_session(year, round_num, 'R')
        if race.results is None or race.results.empty:
            raise HTTPException(status_code=404, detail="No race results available")

        finish_order = race.results['Abbreviation'].tolist()
        finish_pos = {
            row['Abbreviation']: int(float(row['Position']))
            for _, row in race.results.iterrows()
            if pd.notna(row.get('Position'))
        }

        drivers = []
        for drv in finish_order:
            laps = race.laps.pick_driver(drv)
            if laps.empty:
                continue
            laps = laps[laps['LapTime'].notna()]
            if laps.empty:
                continue

            ts = laps['TrackStatus'].fillna('').astype(str)
            clean_mask = (
                (laps['LapNumber'] > 1)
                & laps['PitInTime'].isna()
                & laps['PitOutTime'].isna()
                & ~ts.str.contains('[4567]', regex=True)
            )
            if 'Deleted' in laps.columns:
                clean_mask = clean_mask & ~laps['Deleted'].fillna(False)
            clean = laps[clean_mask]
            clean_secs = clean['LapTime'].dt.total_seconds()

            n = int(len(clean_secs))
            median = round(float(clean_secs.median()), 3) if n else None
            best = round(float(clean_secs.min()), 3) if n else None
            mean = round(float(clean_secs.mean()), 3) if n else None
            std = round(float(clean_secs.std()), 3) if n > 1 else None

            compounds = []
            if n:
                for comp, grp in clean.groupby('Compound'):
                    cs = grp['LapTime'].dt.total_seconds()
                    if not len(cs):
                        continue
                    compounds.append({
                        "compound": str(comp),
                        "laps": int(len(cs)),
                        "median": round(float(cs.median()), 3),
                        "best": round(float(cs.min()), 3),
                    })

            stints = []
            for stint_no, grp in laps.groupby('Stint'):
                comp_vals = grp['Compound'].dropna()
                comp = str(comp_vals.iloc[0]) if not comp_vals.empty else 'UNKNOWN'
                cg = clean[clean['Stint'] == stint_no]
                cs = cg['LapTime'].dt.total_seconds()
                stint_median = round(float(cs.median()), 3) if len(cs) else None
                deg = None
                if len(cs) >= 3:
                    try:
                        slope = float(np.polyfit(cg['LapNumber'].astype(float).to_numpy(),
                                                 cs.to_numpy(), 1)[0])
                        deg = round(slope, 3)
                    except Exception:
                        deg = None
                stints.append({
                    "stint": int(stint_no) if pd.notna(stint_no) else None,
                    "compound": comp,
                    "lap_start": int(grp['LapNumber'].min()),
                    "lap_end": int(grp['LapNumber'].max()),
                    "laps": int(len(grp)),
                    "median": stint_median,
                    "deg": deg,
                })
            stints.sort(key=lambda s: s['lap_start'])

            drivers.append({
                "code": drv,
                "finish": finish_pos.get(drv),
                "clean_laps": n,
                "median": median,
                "best": best,
                "mean": mean,
                "std": std,
                "compounds": compounds,
                "stints": stints,
            })

        medians = [d['median'] for d in drivers if d['median'] is not None]
        fastest = min(medians) if medians else None
        for d in drivers:
            d['delta'] = (round(d['median'] - fastest, 3)
                          if d['median'] is not None and fastest is not None else None)

        drivers.sort(key=lambda d: (d['median'] is None, d['median'] if d['median'] is not None else 1e9))

        return _clean({
            "session": race.event['EventName'],
            "fastest_median": fastest,
            "drivers": drivers,
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FastF1 error: {str(e)}")


@router.get("/api/telemetry/{year}/{round_num}/compare/{d1}/{d2}")
def get_compare(year: int, round_num: int, d1: str, d2: str):
    """Overlay two drivers' fastest-lap telemetry channels + a time delta (d2 vs d1)."""
    d1, d2 = d1.upper(), d2.upper()
    try:
        race = _load_session(year, round_num, 'R', telemetry=True)
    except Exception:
        raise HTTPException(status_code=404, detail="Session data not available yet")

    try:
        if race.results is None or race.results.empty:
            raise HTTPException(status_code=404, detail="No race results available")

        drivers_out: dict[str, Any] = {}
        laps: dict[str, Any] = {}
        for code in (d1, d2):
            lap = race.laps.pick_driver(code).pick_fastest()
            if lap is None or (hasattr(lap, "empty") and lap.empty):
                raise HTTPException(status_code=404, detail=f"No fastest lap found for {code}")
            laps[code] = lap

            tel = lap.get_telemetry()
            want = [c for c in ['Distance', 'Speed', 'Throttle', 'Brake', 'nGear', 'DRS'] if c in tel.columns]
            tel = tel[want].dropna(subset=['Distance'])
            step = max(1, len(tel) // 400)
            t = tel.iloc[::step]

            lt = lap['LapTime']
            lap_sec = round(lt.total_seconds(), 3) if pd.notna(lt) and hasattr(lt, 'total_seconds') else None
            comp = lap.get('Compound')
            team = str(lap['Team']) if pd.notna(lap.get('Team')) else ''

            drivers_out[code] = {
                "team_slug": _team_slug(team),
                "lap_time": lap_sec,
                "compound": str(comp) if comp is not None and pd.notna(comp) else None,
                "distance": t['Distance'].round(1).tolist(),
                "speed": t['Speed'].round(1).tolist() if 'Speed' in t.columns else [],
                "throttle": t['Throttle'].round(0).tolist() if 'Throttle' in t.columns else [],
                "brake": [int(bool(b)) for b in t['Brake']] if 'Brake' in t.columns else [],
                "gear": [int(g) if pd.notna(g) else None for g in t['nGear']] if 'nGear' in t.columns else [],
                "drs": [1 if (pd.notna(v) and int(v) in (10, 12, 14)) else 0 for v in t['DRS']] if 'DRS' in t.columns else [],
            }

        # Time delta of d2 relative to d1 along d1's fastest lap (positive = d2 slower)
        delta_payload = None
        try:
            from fastf1.utils import delta_time
            dt, ref, _cmp = delta_time(laps[d1], laps[d2])
            ref_dist = ref['Distance']
            step = max(1, len(dt) // 400)
            delta_payload = {
                "distance": ref_dist.iloc[::step].round(1).tolist(),
                "delta": [round(float(x), 3) if pd.notna(x) else None for x in dt.iloc[::step]],
            }
        except Exception:
            delta_payload = None

        return _clean({
            "session": race.event['EventName'],
            "round": round_num,
            "d1": d1,
            "d2": d2,
            "drivers": drivers_out,
            "delta": delta_payload,
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FastF1 error: {str(e)}")


@router.get("/api/telemetry/{year}/{round_num}/weather")
def get_weather(year: int, round_num: int):
    """Weather across the race — track/air temp, humidity, wind, rainfall over time."""
    try:
        race = _load_session(year, round_num, 'R', weather=True)
        w = race.weather_data
        if w is None or w.empty:
            raise HTTPException(status_code=404, detail="No weather data available")

        def col(c):
            return w[c] if c in w.columns else None

        if 'Time' in w.columns:
            mins = (w['Time'].dt.total_seconds() / 60.0).round(1).tolist()
        else:
            mins = list(range(len(w)))

        step = max(1, len(w) // 120)
        idx = list(range(0, len(w), step))

        def series(c):
            cc = col(c)
            if cc is None:
                return None
            vals = cc.tolist()
            return [round(float(vals[i]), 1) if pd.notna(vals[i]) else None for i in idx]

        def stat(c, fn):
            cc = col(c)
            if cc is None or not cc.notna().any():
                return None
            return round(float(fn(cc)), 1)

        summary = {
            "track_temp_min": stat('TrackTemp', lambda s: s.min()),
            "track_temp_max": stat('TrackTemp', lambda s: s.max()),
            "track_temp_avg": stat('TrackTemp', lambda s: s.mean()),
            "air_temp_min": stat('AirTemp', lambda s: s.min()),
            "air_temp_max": stat('AirTemp', lambda s: s.max()),
            "air_temp_avg": stat('AirTemp', lambda s: s.mean()),
            "humidity_avg": stat('Humidity', lambda s: s.mean()),
            "wind_avg": stat('WindSpeed', lambda s: s.mean()),
            "wind_max": stat('WindSpeed', lambda s: s.max()),
            "rained": bool(col('Rainfall').any()) if col('Rainfall') is not None else False,
        }

        return _clean({
            "session": race.event['EventName'],
            "time": [mins[i] for i in idx],
            "track_temp": series('TrackTemp'),
            "air_temp": series('AirTemp'),
            "humidity": series('Humidity'),
            "wind_speed": series('WindSpeed'),
            "summary": summary,
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FastF1 error: {str(e)}")


@router.get("/api/telemetry/{year}/{round_num}/race_control")
def get_race_control(year: int, round_num: int):
    """Race control feed — flags, safety cars, penalties, investigations, deleted laps."""
    try:
        race = _load_session(year, round_num, 'R')
        rcm = race.race_control_messages
        if rcm is None or rcm.empty:
            raise HTTPException(status_code=404, detail="No race control data available")

        def classify(u: str, flag: str | None) -> str:
            """Bucket a message into a display kind so the UI can filter the feed."""
            if ('SAFETY CAR' in u or 'VSC' in u or 'MEDICAL CAR' in u
                    or 'MARSHAL' in u or 'RECOVERY VEHICLE' in u):
                return 'safety'
            if 'DELETED' in u or 'TRACK LIMITS' in u:
                return 'track_limits'
            if (u.startswith('FIA STEWARDS') or 'PENALTY' in u or 'INVESTIGAT' in u
                    or 'NOTED' in u or 'REPRIMAND' in u or 'WARNING' in u
                    or 'NO FURTHER ACTION' in u):
                return 'steward'
            if 'DRS' in u:
                return 'drs'
            # Red-flag suspensions arrive with an empty Flag column — catch the
            # text, with a word boundary so "CHEQUERED FLAG" can't match "RED FLAG".
            if re.search(r'\bRED FLAG', u) and 'INFRINGEMENT' not in u:
                return 'flag'
            if flag in ('YELLOW', 'DOUBLE YELLOW', 'RED', 'BLUE', 'CHEQUERED', 'GREEN', 'CLEAR'):
                return 'flag'
            return 'other'

        messages = []
        for _, row in rcm.iterrows():
            msg = str(row.get('Message') or '').strip()
            if not msg:
                continue
            lap = row.get('Lap')
            flag = str(row.get('Flag')) if pd.notna(row.get('Flag')) else None
            messages.append({
                "lap": int(lap) if pd.notna(lap) else None,
                "category": str(row.get('Category') or ''),
                "flag": flag,
                "scope": str(row.get('Scope')) if pd.notna(row.get('Scope')) else None,
                "kind": classify(msg.upper(), flag),
                "message": msg,
            })

        def up(m):
            return m['message'].upper()

        def count(pred):
            return sum(1 for m in messages if pred(m))

        # Yellow flags arrive once per marshal sector — collapse the per-sector
        # spam into incident "periods": a new period begins only when a yellow
        # appears while every sector is currently green.
        yellow_periods = 0
        active_sectors: set[str] = set()
        for m in messages:
            f, u = m['flag'], up(m)
            sec = re.search(r'SECTOR (\d+)', u)
            if f in ('YELLOW', 'DOUBLE YELLOW'):
                if not active_sectors:
                    yellow_periods += 1
                active_sectors.add(sec.group(1) if sec else 'track')
            elif f == 'CLEAR':
                if sec:
                    active_sectors.discard(sec.group(1))
                else:
                    active_sectors.clear()

        summary = {
            "total": len(messages),
            "yellow_flags": yellow_periods,
            # FastF1 sometimes leaves the Flag column empty for a red flag and
            # only writes "RED FLAG - RACE SUSPENDED" in the text — match both,
            # but exclude stewards' "RED FLAG INFRINGEMENT" follow-ups.
            "red_flags": count(
                lambda m: m['flag'] == 'RED'
                or bool(re.search(r'\bRED FLAG', up(m))) and 'INFRINGEMENT' not in up(m)
                and 'NOTED' not in up(m) and 'INVESTIGAT' not in up(m)
            ),
            # FastF1 writes "SAFETY CAR DEPLOYED" for a full SC and "VSC DEPLOYED"
            # (abbreviated) for a virtual one — match both spellings explicitly.
            "safety_car": count(lambda m: 'SAFETY CAR DEPLOYED' in up(m) and 'VIRTUAL' not in up(m)),
            "virtual_sc": count(lambda m: 'VSC DEPLOYED' in up(m) or 'VIRTUAL SAFETY CAR DEPLOYED' in up(m)),
            # Count penalties awarded, not the follow-up "PENALTY SERVED" notice.
            "penalties": count(lambda m: 'PENALTY' in up(m) and 'SERVED' not in up(m) and 'NO FURTHER' not in up(m)),
            "investigations": count(lambda m: 'UNDER INVESTIGATION' in up(m)),
            "deleted_laps": count(lambda m: 'DELETED' in up(m)),
        }

        return _clean({
            "session": race.event['EventName'],
            "summary": summary,
            "messages": messages,
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FastF1 error: {str(e)}")
