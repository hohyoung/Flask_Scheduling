from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import date

class TaskBase(BaseModel):
    content: str
    deadline: Optional[date] = None

class ProjectCreate(BaseModel):
    name: str
    user_id: int
    priority: int
    status: str
    category: str
    start_date: date
    deadline: Optional[date] = None
    tasks: List[TaskBase] = []

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    priority: Optional[int] = None
    progress: Optional[int] = None
    start_date: Optional[date] = None
    deadline: Optional[date] = None
    category: Optional[str] = None
    user_id: Optional[int] = None

class StatusUpdate(BaseModel):
    status: str

    @validator('status')
    def status_must_be_valid(cls, v):
        if v not in ["active", "completed", "scheduled"]:
            raise ValueError("Invalid status")
        return v
