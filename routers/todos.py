from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import asc
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/api")


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
