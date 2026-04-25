import json

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.core.config import settings
from app.schemas import AnalyzeRequest

router = APIRouter(tags=["analyze"])


@router.post(
    "/analyze",
    responses={
        200: {
            "description": "SSE stream of stage + token events",
            "content": {
                "text/event-stream": {
                    "example": (
                        'event: stage\ndata: {"stage":"extract"}\n\n'
                        'event: token\ndata: {"text":"점프 "}\n\n'
                        'event: stage\ndata: {"stage":"done"}\n\n'
                    )
                }
            },
        },
        400: {"description": "Bad request or policy rejection"},
    },
)
async def analyze(req: AnalyzeRequest) -> EventSourceResponse:
    """Accept a clip range + question, stream AI analysis as SSE.

    **Current state (M1.5)**: stub that validates input and emits a canned
    event stream. Real pipeline arrives in M4 (clip extraction), M5 (AI).
    """
    duration = req.duration()
    if duration < settings.clip_min_seconds:
        raise HTTPException(
            status_code=400,
            detail=f"clip too short (min {settings.clip_min_seconds}s)",
        )
    if duration > settings.clip_max_seconds:
        raise HTTPException(
            status_code=400,
            detail=f"clip too long (max {settings.clip_max_seconds}s)",
        )

    async def event_stream():
        yield {
            "event": "stage",
            "data": json.dumps({"stage": "received", "duration_sec": duration}),
        }
        yield {
            "event": "stage",
            "data": json.dumps(
                {
                    "stage": "not_implemented",
                    "message": "analyze pipeline stub — implemented in M4/M5",
                }
            ),
        }
        yield {"event": "done", "data": json.dumps({"ok": True})}

    return EventSourceResponse(event_stream())
