from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routes import analyze, health

app = FastAPI(
    title="ClipAnalyst AI Service",
    description=(
        "Video clip extraction + AI video-understanding pipeline.\n\n"
        "- `GET /health` — liveness\n"
        "- `POST /analyze` — SSE stream of the analysis pipeline\n"
        "- `GET /docs` — Swagger UI\n"
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(analyze.router)
