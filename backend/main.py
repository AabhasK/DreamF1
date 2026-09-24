"""FastAPI entry point: app setup, startup migrations, CORS, and router wiring.

Routes live in app/routers/, one module per area of the API.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import create_db_and_tables, engine
from app.routers import auth, circuit_history, groups, predictions, schedule, standings, telemetry


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    with engine.begin() as conn:
        for col, typ in [
            ("fourth_place", "VARCHAR"),
            ("fifth_place", "VARCHAR"),
            ("safety_car", "BOOLEAN"),
        ]:
            conn.execute(text(f"ALTER TABLE prediction ADD COLUMN IF NOT EXISTS {col} {typ}"))
        for i in range(1, 6):
            conn.execute(text(f"ALTER TABLE event ADD COLUMN IF NOT EXISTS session{i}_name VARCHAR"))
            conn.execute(text(f"ALTER TABLE event ADD COLUMN IF NOT EXISTS session{i}_date TIMESTAMP"))
        conn.execute(text("ALTER TABLE prediction ADD COLUMN IF NOT EXISTS score_breakdown TEXT"))
    yield

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8501",
        "https://dream-f1.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


for module in (schedule, auth, predictions, groups, telemetry, circuit_history, standings):
    app.include_router(module.router)


@app.get("/")
def read_root():
    return {"message": "Welcome to MyF1Circle API!"}
