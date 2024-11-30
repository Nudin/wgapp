import tomllib

import models
from database import get_db
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import get_current_user

router = APIRouter(prefix="/api")


with open("config.toml", "rb") as f:
    config = tomllib.load(f)


@router.get("/tags", tags=["tags"])
def get_tag_list(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    results = db.query(models.Todo.tags).all()
    tags = set([s for t in results for s in t[0].split("+")]) - {""}
    return tags


@router.get("/info", tags=["info"])
def get_info():
    return {
        "registation_open": config.get("registation_open", True),
        "name": config.get("name", ""),
    }
