from fastapi import APIRouter

from app.core.config import settings
from app.schemas import HealthOut

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthOut)
async def health() -> HealthOut:
    """Liveness + provider visibility check."""
    return HealthOut(
        status="ok",
        provider=settings.ai_provider,
        version="0.1.0",
    )
