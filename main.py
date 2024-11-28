import tomllib
from datetime import date, timedelta

from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy import asc, func
from sqlalchemy.orm import Session

import models
import schemas
from auth import (create_access_token, get_current_user, get_password_hash,
                  verify_password)
from database import engine, get_db

with open("config.toml", "rb") as f:
    config = tomllib.load(f)

app = FastAPI()
router = APIRouter(prefix="/api")

app.mount("/webapp", StaticFiles(directory="webapp"), name="webapp")

# Create database tables
models.Base.metadata.create_all(bind=engine)


# Register a new user
@router.post("/register", response_model=schemas.UserInDB, tags=["accounts"])
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if not config.get("registation_open", True):
        raise HTTPException(status_code=403, detail="Registration closed.")
    hashed_password = get_password_hash(user.password)
    db_user = models.User(username=user.username, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# Login to get token
@router.post("/token", response_model=schemas.Token, tags=["accounts"])
def login_for_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
):
    user = (
        db.query(models.User).filter(models.User.username == form_data.username).first()
    )
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


# Protected route example
@router.get("/users/me", tags=["accounts"])
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user


# Add a new todo
@router.post("/todos/", response_model=schemas.TodoResponse, tags=["todos"])
def create_todo(
    todo: schemas.TodoCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_todo = models.Todo(
        name=todo.name,
        description=todo.description,
        frequency=todo.frequency,
        next_due_date=todo.next_due_date,
        tags=todo.tags,
    )
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)
    return db_todo


@router.put("/todos/{todo_id}/", tags=["todos"])
def update_todo(
    todo_id: int,
    update_request: schemas.UpdateTodoRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    todo = db.query(models.Todo).filter(models.Todo.id == todo_id).first()
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    # Update fields if they are provided in the request
    if update_request.name is not None:
        todo.name = update_request.name
    if update_request.description is not None:
        todo.description = update_request.description
    if update_request.frequency is not None:
        todo.frequency = update_request.frequency
    if update_request.next_due_date is not None:
        todo.next_due_date = update_request.next_due_date
    if update_request.archived is not None:
        todo.archived = update_request.archived
    if update_request.tags is not None:
        todo.tags = update_request.tags

    db.commit()

    return {"message": "Todo updated successfully", "todo": todo}


# Mark a todo as done (update next_due_date by adding frequency) and log it
@router.put(
    "/todos/{todo_id}/done", response_model=schemas.TodoResponse, tags=["todos"]
)
def mark_todo_done(
    todo_id: int,
    todo_data: schemas.TodoMarkDone,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_todo = db.query(models.Todo).filter(models.Todo.id == todo_id).first()
    if not db_todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    db_todo.mark_done()

    username = todo_data.username or current_user.username

    # Log the action
    log_entry = models.Log(todo_id=todo_id, username=username, done_date=date.today())
    db.add(log_entry)

    db.commit()
    db.refresh(db_todo)
    return db_todo


@router.put("/todos/{todo_id}/due", response_model=schemas.TodoResponse, tags=["todos"])
def mark_todo_due(
    todo_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_todo = db.query(models.Todo).filter(models.Todo.id == todo_id).first()
    if not db_todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    db_todo.mark_due()

    db.commit()
    db.refresh(db_todo)
    return db_todo


# Postpone a todo by adding the frequency to the current next_due_date
@router.post("/todos/{todo_id}/postpone/", tags=["todos"])
def postpone_todo(
    todo_id: int,
    postpone_request: schemas.PostponeRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    todo = db.query(models.Todo).filter(models.Todo.id == todo_id).first()
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    # Update the next_due_date to the new date provided
    todo.next_due_date = postpone_request.new_due_date
    db.commit()

    return {
        "message": "Todo postponed successfully",
        "next_due_date": todo.next_due_date,
    }


# List all todos
@router.get("/todos/", response_model=list[schemas.TodoResponse], tags=["todos"])
def read_todos(
    skip: int = 0,
    limit: int = 100,
    archived: bool = False,
    tag: str = "",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    search = f"%{tag}%"
    todos = (
        db.query(models.Todo)
        .filter_by(archived=archived)
        .filter(models.Todo.tags.like(search))
        .order_by(asc(models.Todo.next_due_date))
        .offset(skip)
        .limit(limit)
        .all()
    )  # Order by next_due_date
    today = date.today()

    result = []
    for todo in todos:
        is_due = todo.next_due_date <= today
        result.append(
            {
                "id": todo.id,
                "name": todo.name,
                "description": todo.description,
                "frequency": todo.frequency,
                "next_due_date": todo.next_due_date,
                "due": is_due,
                "tags": todo.tags,
            }
        )

    return result


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


@router.get("/info", tags=["info"])
def get_info():
    return {
        "registation_open": config.get("registation_open", True),
        "name": config.get("name", ""),
    }


app.include_router(router)
