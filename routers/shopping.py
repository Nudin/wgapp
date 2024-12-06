import models
import schemas
from database import get_db
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import asc
from sqlalchemy.orm import Session

from auth import get_current_user

router = APIRouter(prefix="/api")


# Add a new item to the shopping list
@router.post("/shopping/", response_model=schemas.ShoppingResponse, tags=["shopping"])
def add_shopping(
    shopping: schemas.ShoppingAdd,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_shopping = models.Shopping(
        title=shopping.title,
        description=shopping.description,
    )
    db.add(db_shopping)
    db.commit()
    db.refresh(db_shopping)
    return db_shopping


# List all items from shopping list
@router.get(
    "/shopping/", response_model=list[schemas.ShoppingResponse], tags=["shopping"]
)
def read_shopping(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    shopping = (
        db.query(models.Shopping).offset(skip).limit(limit).all()
    )  # Order by next_due_date
    return shopping


# Mark an item as done and remove it from the shopping list
@router.delete(
    "/shopping/{shopping_id}/",
    response_model=dict,  # Response model for successful deletion
    tags=["shopping"],
)
def mark_done(
    shopping_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Query the shopping item by ID
    shopping_item = (
        db.query(models.Shopping).filter(models.Shopping.id == shopping_id).first()
    )

    # Check if the item exists
    if not shopping_item:
        raise HTTPException(status_code=404, detail="Shopping item not found")

    # Remove the item from the table
    db.delete(shopping_item)
    db.commit()

    return {
        "message": f"Shopping item with id {shopping_id} has been marked as done and removed."
    }
