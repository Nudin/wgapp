from datetime import date
from typing import Dict, Optional

from pydantic import BaseModel


# Todo creation schema
class TodoCreate(BaseModel):
    name: str
    description: str | None = None
    frequency: int  # Frequency in days
    next_due_date: date
    archived: bool = False
    tags: str = ""


class TodoResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    frequency: int
    next_due_date: date
    due: Optional[bool] = None
    tags: str = ""
    archived: bool = False

    class Config:
        from_attributes = True


class UpdateTodoRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    frequency: Optional[int] = None
    next_due_date: Optional[date] = None
    archived: Optional[bool] = False
    tags: Optional[str] = None


# New schema for marking todo as done with username
class TodoMarkDone(BaseModel):
    username: Optional[str] = None


class PostponeRequest(BaseModel):
    new_due_date: date


# Modify LogResponse to include the Todo name
class LogResponse(BaseModel):
    id: int
    todo_id: int
    username: str
    done_date: date
    todo_name: str  # Add todo_name field to show the name of the todo

    class Config:
        from_attributes = True


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


class ShoppingAdd(BaseModel):
    title: str
    description: str | None = None


class ShoppingResponse(BaseModel):
    id: int
    title: str
    description: str | None = None


class ShoppingMarkDone(BaseModel):
    id: int


class SubscriptionCreate(BaseModel):
    endpoint: str
    expirationTime: Optional[str] = None
    keys: Dict[str, str]
