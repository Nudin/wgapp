import json
import logging
import os
import tomllib
from datetime import date

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import (APIRouter, Depends, FastAPI, HTTPException, Request,
                     Response)
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pywebpush import WebPushException, webpush
from sqlalchemy.orm import Session

import models
import routers.stats
from auth import get_current_user
from database import get_db

with open("config.toml", "rb") as f:
    config = tomllib.load(f)

DER_BASE64_ENCODED_PRIVATE_KEY_FILE_PATH = os.path.join(os.getcwd(), "private_key.txt")
DER_BASE64_ENCODED_PUBLIC_KEY_FILE_PATH = os.path.join(os.getcwd(), "public_key.txt")

VAPID_PRIVATE_KEY = (
    open(DER_BASE64_ENCODED_PRIVATE_KEY_FILE_PATH, "r+").readline().strip("\n")
)
VAPID_PUBLIC_KEY = (
    open(DER_BASE64_ENCODED_PUBLIC_KEY_FILE_PATH, "r+").read().strip("\n")
)

VAPID_CLAIMS = {"sub": "mailto:michi4@schoenitzer.de"}

subscriptions = []  # TODO: Move to database


def send_web_push(subscription_information, message_body):
    try:
        webpush(
            subscription_info=subscription_information,
            data=message_body,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=VAPID_CLAIMS,
        )
        return {"success": 1}
    except WebPushException as e:
        logging.error(f"WebPush failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def scheduled_notification():
    print(f"Sending scheduled notification to {len(subscriptions)} subscribers")
    db = next(get_db())
    all_todos = routers.todos._get_todos(db=db)
    due_todos = [todo for todo in all_todos if todo["next_due_date"] == date.today()]
    if not due_todos:
        return
    message = "New tasks due today:\n" + "\n".join([todo["name"] for todo in due_todos])
    for subscription in subscriptions:
        try:
            send_web_push(subscription, message)
        except Exception as e:
            logging.error(f"Failed to send scheduled notification: {e}")


router = APIRouter(prefix="/api")


@router.get("/subscription/", tags=["subscription"])
async def get_subscription():
    return JSONResponse(
        content={"public_key": VAPID_PUBLIC_KEY},
        headers={"Access-Control-Allow-Origin": "*"},
    )


@router.post("/subscription/", tags=["subscription"])
async def create_subscription(request: Request):
    try:
        body = await request.json()
        subscription_token = body.get("subscription_token")
        if not subscription_token:
            raise HTTPException(status_code=400, detail="Missing subscription_token")
        subscriptions.append(subscription_token)
        return Response(status_code=201, media_type="application/json")
    except Exception as e:
        logging.error(f"Error in subscription: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.delete("/subscription/", tags=["subscription"])
async def delete_subscription(request: Request):
    try:
        body = await request.json()
        subscription_token = body.get("subscription_token")
        if not subscription_token:
            raise HTTPException(status_code=400, detail="Missing subscription_token")
        subscriptions.remove(subscription_token)
        return Response(status_code=204)
    except Exception as e:
        logging.error(f"Error in subscription: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
