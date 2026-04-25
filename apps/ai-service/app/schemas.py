from datetime import datetime

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    video_id: str = Field(..., min_length=1, max_length=64, description="YouTube video ID")
    start_sec: float = Field(..., ge=0)
    end_sec: float = Field(..., ge=0)
    question: str = Field(..., min_length=1, max_length=500)

    def duration(self) -> float:
        return max(0.0, self.end_sec - self.start_sec)


class ChatTurnOut(BaseModel):
    id: int
    clip_id: int
    question: str
    answer: str
    provider: str
    model_name: str
    tokens_in: int
    tokens_out: int
    latency_ms: int
    created_at: datetime


class HealthOut(BaseModel):
    status: str
    provider: str
    version: str
