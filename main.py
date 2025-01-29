from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

import models
import notification
import routers
import routers.auth
import routers.logs
import routers.shopping
import routers.stats
import routers.todos
import signalbot
from database import engine

app = FastAPI()

app.mount("/webapp", StaticFiles(directory="webapp"), name="webapp")

# Create database tables
models.Base.metadata.create_all(bind=engine)


app.include_router(routers.auth.router)
app.include_router(routers.todos.router)
app.include_router(routers.logs.router)
app.include_router(routers.stats.router)
app.include_router(routers.shopping.router)
app.include_router(routers.router)
app.include_router(signalbot.router)
app.include_router(notification.router)


scheduler = BackgroundScheduler()


@app.on_event("startup")
async def startup_event():
    scheduler.start()

    # Add a job to run every first of the month at 12:00 PM
    trigger = CronTrigger(day="1", hour="12")
    scheduler.add_job(
        signalbot.generate_monthly_report,
        trigger,
        id="monthly_report",
        replace_existing=True,
    )
    scheduler.add_job(
        notification.scheduled_notification,
        "cron",
        hour="12",
    )


@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()
