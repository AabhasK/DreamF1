"""Circles: create, join, list, and per-group leaderboard."""
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, func, select

from app.auth import get_current_user
from app.database import get_session
from app.models import Group, GroupCreate, GroupJoin, GroupMember, User

router = APIRouter()


@router.post("/api/groups")
def create_group(data: GroupCreate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    group = Group(
        name=data.name,
        invite_code=secrets.token_hex(6),
        created_by=current_user.id
    )
    session.add(group)
    session.commit()
    session.refresh(group)

    session.add(GroupMember(user_id=current_user.id, group_id=group.id))
    session.commit()
    return {"id": group.id, "name": group.name, "invite_code": group.invite_code, "created_by": group.created_by}


@router.post("/api/groups/join")
def join_group(data: GroupJoin, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    group = session.exec(select(Group).where(Group.invite_code == data.invite_code)).first()
    if not group:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    already_member = session.exec(
        select(GroupMember)
        .where(GroupMember.user_id == current_user.id)
        .where(GroupMember.group_id == group.id)
    ).first()

    if already_member:
        raise HTTPException(status_code=400, detail="Already in this group")

    session.add(GroupMember(user_id=current_user.id, group_id=group.id))
    session.commit()
    return {"message": f"Joined '{group.name}'", "group_name": group.name}


@router.get("/api/groups")
def get_my_groups(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    results = session.exec(
        select(Group.id, Group.name, Group.invite_code, func.count(GroupMember.user_id).label("member_count"))
        .join(GroupMember, Group.id == GroupMember.group_id)
        .where(GroupMember.user_id == current_user.id)
        .group_by(Group.id)
    ).all()

    return [{"id": r.id, "name": r.name, "invite_code": r.invite_code, "member_count": r.member_count} for r in results]


@router.get("/api/groups/{group_id}/leaderboard")
def get_group_leaderboard(group_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    membership = session.exec(
        select(GroupMember)
        .where(GroupMember.user_id == current_user.id)
        .where(GroupMember.group_id == group_id)
    ).first()

    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    results = session.exec(
        select(User.username, User.total_points)
        .join(GroupMember, User.id == GroupMember.user_id)
        .where(GroupMember.group_id == group_id)
        .order_by(User.total_points.desc())
    ).all()

    return [{"rank": i + 1, "username": r.username, "total_points": r.total_points} for i, r in enumerate(results)]
