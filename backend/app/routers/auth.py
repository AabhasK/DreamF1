"""Register, login and current-user endpoints (JWT issued by app.auth)."""
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, func, select

from app.auth import create_access_token, get_current_user, get_password_hash, verify_password
from app.database import get_session
from app.models import User, UserCreate

router = APIRouter()


_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@router.post("/api/register")
def register_user(user_data: UserCreate, session: Session = Depends(get_session)):
    username = (user_data.username or "").strip()
    email = (user_data.email or "").strip().lower()

    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if not _EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Enter a valid email address")
    if len(user_data.password or "") < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    # Case-insensitive uniqueness so "Bob" and "bob" can't both register.
    if session.exec(select(User).where(func.lower(User.username) == username.lower())).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if session.exec(select(User).where(func.lower(User.email) == email)).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        username=username,
        email=email,
        hashed_password=get_password_hash(user_data.password),
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)

    # Auto-login: hand back a token so the user is signed in straight after sign-up.
    access_token = create_access_token(data={"sub": str(new_user.id)})
    return {"access_token": access_token, "token_type": "bearer", "username": new_user.username}


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/api/login")
def login(login_data: LoginRequest, session: Session = Depends(get_session)):
    username = (login_data.username or "").strip()
    user = session.exec(select(User).where(func.lower(User.username) == username.lower())).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer", "username": user.username}


@router.get("/api/me")
def get_me(current_user: User = Depends(get_current_user)):
    """Validate the token and return the current user's profile."""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "total_points": current_user.total_points,
    }
