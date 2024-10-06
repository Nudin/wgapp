from datetime import date

# from . import models, schemas
import models
import schemas
from database import engine, get_db
from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

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

    # Mark the todo as done (update the next due date)
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


# List all logs (Optional, for debugging or tracking purposes)
@app.get("/logs/", response_model=list[schemas.LogResponse])
def get_logs(db: Session = Depends(get_db)):
    logs = db.query(models.Log).all()
    return logs


# List all todos
@app.get("/todos/", response_model=list[schemas.TodoResponse])
def read_todos(db: Session = Depends(get_db)):
    todos = db.query(models.Todo).all()
    return todos
