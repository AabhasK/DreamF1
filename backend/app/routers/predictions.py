"""Submitting picks (next race only), prediction history, and race scoring."""
import json
from datetime import datetime

import fastf1 as ff1
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.auth import get_current_user
from app.database import get_session
from app.models import Event, Prediction, PredictionCreate, User

router = APIRouter()


@router.post("/api/predict")
def submit_prediction(
    prediction_data: PredictionCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    next_race = session.exec(
        select(Event)
        .where(Event.event_date >= datetime.now().date())
        .where(Event.is_completed == False)
        .order_by(Event.event_date)
    ).first()

    if not next_race:
        raise HTTPException(status_code=400, detail="No upcoming races found")

    already_predicted = session.exec(
        select(Prediction)
        .where(Prediction.user_id == current_user.id)
        .where(Prediction.event_id == next_race.id)
    ).first()

    if already_predicted:
        raise HTTPException(status_code=400, detail="You already predicted this race")

    new_prediction = Prediction(
        user_id=current_user.id,
        event_id=next_race.id,
        first_place=prediction_data.first_place,
        second_place=prediction_data.second_place,
        third_place=prediction_data.third_place,
        fourth_place=prediction_data.fourth_place,
        fifth_place=prediction_data.fifth_place,
        fastest_lap=prediction_data.fastest_lap,
        dnf_driver=prediction_data.dnf_driver,
        pole_position=prediction_data.pole_position,
        safety_car=prediction_data.safety_car,
    )
    session.add(new_prediction)
    session.commit()
    return {"message": f"Prediction locked in for {next_race.event_name}!", "prediction": new_prediction}


@router.get("/api/predictions")
def get_user_predictions(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    return session.exec(select(Prediction).where(Prediction.user_id == current_user.id)).all()


@router.post("/api/score/{event_id}")
def score_race(event_id: int, session: Session = Depends(get_session)):
    event = session.exec(select(Event).where(Event.id == event_id)).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    try:
        race_session = ff1.get_session(2026, event.round_number, 'R')
        race_session.load(telemetry=False, weather=False)
        quali_session = ff1.get_session(2026, event.round_number, 'Q')
        quali_session.load(telemetry=False, weather=False)
    except Exception:
        raise HTTPException(status_code=400, detail="FastF1 doesn't have results yet")

    results = race_session.results
    if results.empty:
        raise HTTPException(status_code=400, detail="Race results are empty")

    actual_p1 = results.iloc[0]['Abbreviation']
    actual_p2 = results.iloc[1]['Abbreviation']
    actual_p3 = results.iloc[2]['Abbreviation']
    actual_p4 = results.iloc[3]['Abbreviation'] if len(results) > 3 else None
    actual_p5 = results.iloc[4]['Abbreviation'] if len(results) > 4 else None
    actual_fastest = race_session.laps.pick_fastest()['Driver']
    actual_pole = quali_session.results.iloc[0]['Abbreviation']
    actual_dnfs = results[~results['Status'].str.contains(r'Finished|\+', regex=True)]['Abbreviation'].tolist()
    track_statuses = race_session.laps['TrackStatus'].dropna()
    actual_safety_car = bool(track_statuses.str.contains('4').any())

    predictions = session.exec(select(Prediction).where(Prediction.event_id == event_id)).all()
    for pred in predictions:
        p1_pts  = 10 if pred.first_place == actual_p1 else 0
        p2_pts  = 10 if pred.second_place == actual_p2 else 0
        p3_pts  = 10 if pred.third_place == actual_p3 else 0
        p4_pts  = 8  if pred.fourth_place and pred.fourth_place == actual_p4 else 0
        p5_pts  = 6  if pred.fifth_place and pred.fifth_place == actual_p5 else 0
        fl_pts  = 5  if pred.fastest_lap == actual_fastest else 0
        pol_pts = 5  if pred.pole_position == actual_pole else 0
        dnf_pts = 5  if pred.dnf_driver and pred.dnf_driver in actual_dnfs else 0
        sc_pts  = 5  if pred.safety_car is not None and pred.safety_car == actual_safety_car else 0

        old_pts = pred.points_earned or 0
        pred.points_earned = p1_pts + p2_pts + p3_pts + p4_pts + p5_pts + fl_pts + pol_pts + dnf_pts + sc_pts
        pred.score_breakdown = json.dumps({
            "pole": {"pick": pred.pole_position, "actual": actual_pole, "pts": pol_pts},
            "p1":   {"pick": pred.first_place,   "actual": actual_p1,  "pts": p1_pts},
            "p2":   {"pick": pred.second_place,  "actual": actual_p2,  "pts": p2_pts},
            "p3":   {"pick": pred.third_place,   "actual": actual_p3,  "pts": p3_pts},
            "p4":   {"pick": pred.fourth_place,  "actual": actual_p4,  "pts": p4_pts} if pred.fourth_place else None,
            "p5":   {"pick": pred.fifth_place,   "actual": actual_p5,  "pts": p5_pts} if pred.fifth_place else None,
            "fl":   {"pick": pred.fastest_lap,   "actual": actual_fastest, "pts": fl_pts},
            "dnf":  {"pick": pred.dnf_driver,    "actual": ", ".join(actual_dnfs), "pts": dnf_pts} if pred.dnf_driver else None,
            "sc":   {"pick": "Yes" if pred.safety_car else "No", "actual": "Yes" if actual_safety_car else "No", "pts": sc_pts} if pred.safety_car is not None else None,
        })
        session.add(pred)

        # Add only the delta so re-scoring a race stays idempotent
        user = session.get(User, pred.user_id)
        if user:
            user.total_points += (pred.points_earned - old_pts)
            session.add(user)

    event.is_completed = True
    session.add(event)
    session.commit()
    return {"message": f"Scored {len(predictions)} predictions for {event.event_name}"}
