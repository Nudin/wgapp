from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from datetime import timedelta, date

from database import Base


class Todo(Base):
    __tablename__ = "todos"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    frequency = Column(Integer, nullable=False)  # Frequency in days
    next_due_date = Column(Date, nullable=False)

    logs = relationship("Log", back_populates="todo")

    def mark_done(self):
        # Update next_due_date by adding the frequency (in days)
        self.next_due_date += timedelta(days=self.frequency)

    def mark_due(self):
        # Set next_due_date to today's date
        self.next_due_date = date.today()


class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
    todo_id = Column(Integer, ForeignKey("todos.id"), nullable=False)
    username = Column(String, nullable=False)
    done_date = Column(Date, default=date.today)

    todo = relationship("Todo", back_populates="logs")
