import subprocess
import tomllib
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
import routers.stats
from auth import get_current_user
from database import get_db

with open("config.toml", "rb") as f:
    config = tomllib.load(f)


def send_signal_message(my_phone_number: str, group_id: str, message: str):
    try:
        # Signal-CLI Kommando aufrufen
        subprocess.run(
            [
                "signal-cli",
                "-u",
                my_phone_number,
                "send",
                "-m",
                message,
                "-g",
                group_id,
            ],
            check=True,
        )
        print("Nachricht erfolgreich gesendet.")
    except subprocess.CalledProcessError as e:
        print(f"Fehler beim Senden der Nachricht: {e}")


def generate_user_task_list(stat: dict) -> str:
    # Extract and sort the user stats by task_count in descending order
    sorted_stats = sorted(
        stat["user_stats"], key=lambda x: x["task_count"], reverse=True
    )

    # Highlight the user with the most tasks
    top_emoji = "🌟"

    # Build the output string
    result = []
    for index, user_stat in enumerate(sorted_stats):
        username = user_stat["username"]
        task_count = user_stat["task_count"]
        # Add the emoji to the user with the most tasks
        line = f"{username}: {task_count} tasks"
        if index == 0:  # The first user has the most tasks
            line += f" {top_emoji}"
        result.append(line)

    return "\n".join(result)


def generate_monthly_report(month=None, db=None):
    # Replace this logic with your reporting function
    print("Generating monthly report...")
    db = db or next(get_db())
    current_month = date.today().month
    if month is None:
        month = current_month - 1
        if month == 0:
            month = 12
    stat = routers.stats._get_monthly_task_statistics(month=month, db=db)
    formatted_stat = generate_user_task_list(stat)
    print(f"Monthly report generated: {formatted_stat}")
    if config.get("signal_account") and config.get("signal_group_id"):
        send_signal_message(
            config.get("signal_account"),
            config.get("signal_group_id"),
            f"WG-APP-Statistik für letzten Monat: {formatted_stat}",
        )


router = APIRouter(prefix="/api")


@router.get("/send_stats", tags=["logs"])
def get_task_statistics(
    _: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    generate_monthly_report(db=db)
    return None
