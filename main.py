from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

import models
import routers
import routers.auth
import routers.logs
import routers.stats
import routers.todos
from database import engine

app = FastAPI()

app.mount("/webapp", StaticFiles(directory="webapp"), name="webapp")

# Create database tables
models.Base.metadata.create_all(bind=engine)


app.include_router(routers.auth.router)
app.include_router(routers.todos.router)
app.include_router(routers.logs.router)
app.include_router(routers.stats.router)
app.include_router(routers.router)
