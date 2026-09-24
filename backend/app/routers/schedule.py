"""2026 calendar, synced from FastF1 into the Event table on every call."""
import fastf1 as ff1
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.database import get_session
from app.models import Event
from app.utils import _clean_str, _parse_session_dt

router = APIRouter()


@router.get("/api/schedule")
def get_schedule(session: Session = Depends(get_session)):
    schedule = ff1.get_event_schedule(2026)
    filtered = schedule[schedule['RoundNumber'] > 0]
    existing = {e.round_number: e for e in session.exec(select(Event)).all()}

    result = []
    for _, row in filtered.iterrows():
        rn = int(row['RoundNumber'])
        fields = dict(
            event_name=row['EventName'],
            country=row['Country'],
            event_date=row['EventDate'].to_pydatetime().date(),
            session1_name=_clean_str(row.get('Session1')),
            session1_date=_parse_session_dt(row.get('Session1Date')),
            session2_name=_clean_str(row.get('Session2')),
            session2_date=_parse_session_dt(row.get('Session2Date')),
            session3_name=_clean_str(row.get('Session3')),
            session3_date=_parse_session_dt(row.get('Session3Date')),
            session4_name=_clean_str(row.get('Session4')),
            session4_date=_parse_session_dt(row.get('Session4Date')),
            session5_name=_clean_str(row.get('Session5')),
            session5_date=_parse_session_dt(row.get('Session5Date')),
        )
        if rn in existing:
            ev = existing[rn]
            ev.event_name = fields['event_name']
            ev.country = fields['country']
            ev.event_date = fields['event_date']
            ev.session1_name = fields['session1_name']
            ev.session1_date = fields['session1_date']
            ev.session2_name = fields['session2_name']
            ev.session2_date = fields['session2_date']
            ev.session3_name = fields['session3_name']
            ev.session3_date = fields['session3_date']
            ev.session4_name = fields['session4_name']
            ev.session4_date = fields['session4_date']
            ev.session5_name = fields['session5_name']
            ev.session5_date = fields['session5_date']
        else:
            ev = Event(round_number=rn, **fields)
            session.add(ev)
        result.append(ev)

    session.commit()
    for ev in result:
        session.refresh(ev)
    return result
