"""A race's headline result (winner, podium, pole, FL, SC, DNFs) — powers the last-race recap."""
import pandas as pd
from fastapi import APIRouter

from app.fastf1_cache import _load_session
from app.utils import _clean, _team_slug

router = APIRouter()


@router.get("/api/circuit_history/{year}/{round_num}")
def get_circuit_history(year: int, round_num: int):
    """Return the race result for the given year & round (used for the last-race recap)."""
    try:
        hist = _load_session(year, round_num, 'R', weather=True)
    except Exception:
        return {"_error": f"No data for {year} Round {round_num}"}

    try:
        results = hist.results
        if results is None or results.empty:
            return {"_error": "No race results"}

        winner_row = results.iloc[0]
        winner = str(winner_row['Abbreviation']) if pd.notna(winner_row.get('Abbreviation')) else None
        winner_team = (
            str(winner_row['TeamName'])
            if 'TeamName' in results.columns and pd.notna(winner_row.get('TeamName'))
            else None
        )

        pole = None
        if 'GridPosition' in results.columns:
            pole_rows = results[results['GridPosition'] == 1.0]
            if not pole_rows.empty:
                pole = str(pole_rows.iloc[0]['Abbreviation'])

        fl_driver = None
        fl_time_str = None
        try:
            fastest_lap = hist.laps.pick_fastest()
            fl_driver = str(fastest_lap['Driver'])
            t = fastest_lap['LapTime']
            if pd.notna(t) and hasattr(t, 'total_seconds'):
                secs = t.total_seconds()
                m = int(secs // 60)
                s = secs % 60
                fl_time_str = f"{m}:{s:06.3f}"
        except Exception:
            pass

        # Podium — top 3 with team slug for colours/logos
        podium = []
        for i in range(min(3, len(results))):
            r = results.iloc[i]
            code = str(r['Abbreviation']) if pd.notna(r.get('Abbreviation')) else None
            if not code:
                continue
            team = str(r['TeamName']) if 'TeamName' in results.columns and pd.notna(r.get('TeamName')) else ""
            podium.append({"position": i + 1, "code": code, "team_slug": _team_slug(team)})

        sc = bool(hist.laps['TrackStatus'].dropna().str.contains('4').any())
        dnf_count = int((~results['Status'].str.contains(r'Finished|\+', regex=True, na=False)).sum())

        total_laps = None
        try:
            nl = winner_row.get('Laps')
            if nl is None or not pd.notna(nl):
                nl = winner_row.get('NumberOfLaps')
            if nl is not None and pd.notna(nl):
                total_laps = int(nl)
        except Exception:
            pass

        # Race-control incident summary (more FastF1 data)
        incidents = None
        try:
            rcm = hist.race_control_messages
            if rcm is not None and not rcm.empty:
                up = rcm['Message'].fillna('').astype(str).str.upper()
                flags = (rcm['Flag'].fillna('').astype(str)
                         if 'Flag' in rcm.columns else pd.Series([''] * len(rcm)))
                incidents = {
                    "yellow_flags": int(flags.isin(['YELLOW', 'DOUBLE YELLOW']).sum()),
                    "red_flags": int((flags == 'RED').sum()),
                    "safety_car": int((up.str.contains('SAFETY CAR') & ~up.str.contains('VIRTUAL') & up.str.contains('DEPLOYED')).sum()),
                    "virtual_sc": int((up.str.contains('VIRTUAL SAFETY CAR') & up.str.contains('DEPLOYED')).sum()),
                    "penalties": int(up.str.contains('PENALTY').sum()),
                    "investigations": int(up.str.contains('INVESTIGAT').sum()),
                }
        except Exception:
            incidents = None

        # Weather summary (more FastF1 data)
        weather = None
        try:
            w = hist.weather_data
            if w is not None and not w.empty:
                def _wmean(col):
                    return round(float(w[col].mean()), 1) if col in w.columns and w[col].notna().any() else None
                weather = {
                    "air_temp": _wmean('AirTemp'),
                    "track_temp": _wmean('TrackTemp'),
                    "track_temp_max": (round(float(w['TrackTemp'].max()), 1)
                                       if 'TrackTemp' in w.columns and w['TrackTemp'].notna().any() else None),
                    "humidity": _wmean('Humidity'),
                    "wind_speed": _wmean('WindSpeed'),
                    "rain": bool(w['Rainfall'].any()) if 'Rainfall' in w.columns else False,
                }
        except Exception:
            weather = None

        event_name = None
        try:
            event_name = str(hist.event['EventName'])
        except Exception:
            pass

        return _clean({
            "year": year,
            "event_name": event_name,
            "winner": winner,
            "winner_team": winner_team,
            "winner_team_slug": _team_slug(winner_team or ""),
            "podium": podium,
            "pole": pole,
            "fastest_lap_driver": fl_driver,
            "fastest_lap_time": fl_time_str,
            "safety_car": sc,
            "dnf_count": dnf_count,
            "total_laps": total_laps,
            "incidents": incidents,
            "weather": weather,
        })
    except Exception as e:
        return {"_error": str(e)}
