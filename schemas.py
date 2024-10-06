from pydantic import BaseModel
from datetime import date


# Todo creation schema
class TodoCreate(BaseModel):
    name: str
    description: str | None = None
    frequency: int  # Frequency in days
    next_due_date: date


class TodoUpdate(BaseModel):
    id: int


class TodoResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    frequency: int
    next_due_date: date

    class Config:
        from_attributes = True


# New schema for marking todo as done with username
class TodoMarkDone(BaseModel):
    username: str


# Modify LogResponse to include the Todo name
class LogResponse(BaseModel):
    id: int
    todo_id: int
    username: str
    done_date: date
    todo_name: str  # Add todo_name field to show the name of the todo

    class Config:
        from_attributes = True
