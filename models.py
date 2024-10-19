from datetime import date, timedelta

from sqlalchemy import Boolean, Column, Date, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from database import Base


class Todo(Base):
    __tablename__ = "todos"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    frequency = Column(Integer, nullable=False)  # Frequency in days
    next_due_date = Column(Date, nullable=False)
    archived = Column(Boolean, default=False)

    logs = relationship("Log", back_populates="todo")

    def mark_done(self):
        # negative frequency means this is an onetime-task -> archive it
        if self.frequency < 0:
            self.archived = True
        else:
            # Update next_due_date by adding the frequency (in days)
            self.next_due_date = date.today() + timedelta(days=self.frequency)

    def mark_due(self):
        # Set next_due_date to today's date
        if self.next_due_date > date.today():
            self.next_due_date = date.today()

    def postpone(self):
        self.next_due_date = date.today() + timedelta(days=self.frequency) // 2


class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
    todo_id = Column(Integer, ForeignKey("todos.id"), nullable=False)
    username = Column(String, nullable=False)
    done_date = Column(Date, default=date.today)

    todo = relationship("Todo", back_populates="logs")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)

    # Relationship with logs (for task completion tracking)
    # logs = relationship("Log", back_populates="user")
