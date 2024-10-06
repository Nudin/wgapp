from datetime import date, timedelta

from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import engine, get_db

app = FastAPI()

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
@app.put("/todos/{todo_id}/postpone", response_model=schemas.TodoResponse)
def postpone_todo_due(todo_id: int, db: Session = Depends(get_db)):
    db_todo = db.query(models.Todo).filter(models.Todo.id == todo_id).first()
    if not db_todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    db_todo.postpone()

    db.commit()
    db.refresh(db_todo)
    return db_todo


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
def read_todos(db: Session = Depends(get_db)):
    todos = db.query(models.Todo).all()
    return todos
