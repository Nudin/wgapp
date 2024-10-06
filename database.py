from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Replace with your actual database URL (e.g., PostgreSQL or SQLite)
# DATABASE_URL = "postgresql://user:password@localhost/dbname"
DATABASE_URL = "sqlite:///./sql_app.db"

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
