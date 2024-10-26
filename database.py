import tomllib

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

with open("config.toml", "rb") as f:
    config = tomllib.load(f)

engine = create_engine(config.get("database_url", "sqlite:///./sql_app.db"))

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
