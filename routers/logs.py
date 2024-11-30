from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/api")


# List all logs, now including the associated todo's name
@router.get("/logs/", response_model=list[schemas.LogResponse], tags=["logs"])
def get_logs(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logs = db.query(models.Log).all()

    # Construct the response to include todo_name
    response = []
    for log in logs:
        log_response = schemas.LogResponse(
            id=log.id,
            todo_id=log.todo_id,
            username=log.username,
            done_date=log.done_date,
            todo_name=log.todo.name,  # Access the name of the associated todo
        )
        response.append(log_response)

    return response


# List all logs, now including the associated todo's name
@router.get("/logs/{todo_id}", response_model=list[schemas.LogResponse], tags=["logs"])
def get_logs_for_task(
    todo_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logs = db.query(models.Log).filter_by(todo_id=todo_id).all()

    # Construct the response to include todo_name
    response = []
    for log in logs:
        log_response = schemas.LogResponse(
            id=log.id,
            todo_id=log.todo_id,
            username=log.username,
            done_date=log.done_date,
            todo_name=log.todo.name,  # Access the name of the associated todo
        )
        response.append(log_response)

    return response


# List all logs, now including the associated todo's name
@router.get(
    "/logs/by-user/{username}", response_model=list[schemas.LogResponse], tags=["logs"]
)
def get_logs_by_user(
    username: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logs = db.query(models.Log).filter_by(username=username).all()

    # Construct the response to include todo_name
    response = []
    for log in logs:
        log_response = schemas.LogResponse(
            id=log.id,
            todo_id=log.todo_id,
            username=log.username,
            done_date=log.done_date,
            todo_name=log.todo.name,  # Access the name of the associated todo
        )
        response.append(log_response)

    return response
