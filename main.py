from datetime import date, timedelta

from fastapi import Depends, FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from sqlalchemy import asc
from sqlalchemy.orm import Session

import models
import schemas
from database import engine, get_db

app = FastAPI()

app.mount("/webapp", StaticFiles(directory="webapp"), name="webapp")

# Create database tables
models.Base.metadata.create_all(bind=engine)


# Add a new todo
@app.post("/todos/", response_model=schemas.TodoResponse)
def create_todo(todo: schemas.TodoCreate, db: Session = Depends(get_db)):
    db_todo = models.Todo(
        name=todo.name,
        description=todo.description,
        frequency=todo.frequency,
        next_due_date=todo.next_due_date,
    )
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)
    return db_todo


@app.put("/todos/{todo_id}/")
def update_todo(
    todo_id: int,
    update_request: schemas.UpdateTodoRequest,
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

    db.commit()

    return {"message": "Todo updated successfully", "todo": todo}


# Mark a todo as done (update next_due_date by adding frequency) and log it
@app.put("/todos/{todo_id}/done", response_model=schemas.TodoResponse)
def mark_todo_done(
    todo_id: int, todo_data: schemas.TodoMarkDone, db: Session = Depends(get_db)
):
    db_todo = db.query(models.Todo).filter(models.Todo.id == todo_id).first()
    if not db_todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    db_todo.mark_done()

    # Log the action
    log_entry = models.Log(
        todo_id=todo_id, username=todo_data.username, done_date=date.today()
    )
    db.add(log_entry)

    db.commit()
    db.refresh(db_todo)
    return db_todo


@app.put("/todos/{todo_id}/due", response_model=schemas.TodoResponse)
def mark_todo_due(todo_id: int, db: Session = Depends(get_db)):
    db_todo = db.query(models.Todo).filter(models.Todo.id == todo_id).first()
    if not db_todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    db_todo.mark_due()

    db.commit()
    db.refresh(db_todo)
    return db_todo


# Postpone a todo by adding the frequency to the current next_due_date
@app.post("/todos/{todo_id}/postpone/")
def postpone_todo(
    todo_id: int,
    postpone_request: schemas.PostponeRequest,
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


# List all logs, now including the associated todo's name
@app.get("/logs/", response_model=list[schemas.LogResponse])
def get_logs(db: Session = Depends(get_db)):
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


# List all todos
@app.get("/todos/", response_model=list[schemas.TodoResponse])
def read_todos(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    todos = (
        db.query(models.Todo)
        .order_by(asc(models.Todo.next_due_date))
        .offset(skip)
        .limit(limit)
        .all()
    )  # Order by next_due_date
    return todos
