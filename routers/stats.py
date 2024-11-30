from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/api")


@router.get("/stats", tags=["logs"])
def get_task_statistics(
    current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    # Query the log table to count how many tasks each user has completed
    results = (
        db.query(models.Log.username, func.count(models.Log.id).label("task_count"))
        .group_by(models.Log.username)
        .all()
    )

    # Create a response with each user and their task completion count
    stats = {
        "user_stats": [
            {"username": result.username, "task_count": result.task_count}
            for result in results
        ]
    }

    return stats


@router.get("/stats/{todo_id}", tags=["logs"])
def get_task_statistics_for_task(
    todo_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Query the log table to count how many tasks each user has completed
    results = (
        db.query(models.Log.username, func.count(models.Log.id).label("task_count"))
        .where(models.Log.todo_id == todo_id)
        .group_by(models.Log.username)
        .all()
    )

    # Create a response with each user and their task completion count
    stats = {
        "user_stats": [
            {"username": result.username, "task_count": result.task_count}
            for result in results
        ]
    }

    return stats
