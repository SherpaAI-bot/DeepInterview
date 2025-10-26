from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class CandidateRegister(BaseModel):
    full_name: str

class CandidateResponse(BaseModel):
    status: str
    message: str
    processes: Optional[List[str]] = None

class ChatRequest(BaseModel):
    full_name: str
    message: str

class ChatResponse(BaseModel):
    bot_message: str
    progress: int

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminToken(BaseModel):
    access_token: str
    token_type: str

class CandidateStatus(BaseModel):
    id: int
    full_name: str
    processes: str
    interview_status: str
    progress_percent: int
    created_at: datetime

class AnalyticsData(BaseModel):
    full_name: str
    total_time_minutes: float
    estimated_cost_rub: float
    process_count: int

class AdminStats(BaseModel):
    total_candidates: int
    completed_interviews: int
    in_progress_interviews: int
    not_started_interviews: int
