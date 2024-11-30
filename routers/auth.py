import tomllib

import models
import schemas
from database import get_db
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from auth import (create_access_token, get_current_user, get_password_hash,
                  verify_password)

router = APIRouter(prefix="/api")


with open("config.toml", "rb") as f:
    config = tomllib.load(f)


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
