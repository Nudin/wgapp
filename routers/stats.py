from datetime import date

import models
from database import get_db
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import get_current_user

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


@router.get("/stats/monthly", tags=["logs"])
def get_monthly_task_statistics(
    month: int = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_monthly_task_statistics(month, db)


def _get_monthly_task_statistics(month: int = None, db: Session = Depends(get_db)):
    # Query the log table to count how many tasks each user has completed in the given month
    current_year = date.today().year
    current_month = date.today().month
    if month is None:
        month = current_month
    elif month > current_month:
        current_year -= 1
    results = (
        db.query(models.Log.username, func.count(models.Log.id).label("task_count"))
        .filter(
            func.extract("month", models.Log.done_date) == month,
            func.extract("year", models.Log.done_date) == current_year,
        )
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
