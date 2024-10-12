from datetime import date
from typing import Optional

from pydantic import BaseModel


# Todo creation schema
class TodoCreate(BaseModel):
    name: str
    description: str | None = None
    frequency: int  # Frequency in days
    next_due_date: date
    archived: bool = False


class TodoUpdate(BaseModel):
    id: int


class TodoResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    frequency: int
    next_due_date: date
    due: bool

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


class PostponeRequest(BaseModel):
    new_due_date: date


class UpdateTodoRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    frequency: Optional[int] = None
    next_due_date: Optional[date] = None
    archived: Optional[bool] = False


class UserCreate(BaseModel):
    username: str
    password: str


class UserInDB(BaseModel):
    username: str
    hashed_password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str | None = None
