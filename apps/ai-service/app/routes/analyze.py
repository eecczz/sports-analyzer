import json
import shutil

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.core.config import settings
from app.schemas import AnalyzeRequest
from app.services.ai import analyze_clip
from app.services.clip import extract_youtube_clip

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
                        'event: token\ndata: {"text":"팔꿈치가 "}\n\n'
                        'event: done\ndata: {"ok":true}\n\n'
                    )
                }
            },
        },
        400: {"description": "Bad request or policy rejection"},
    },
)
async def analyze(req: AnalyzeRequest) -> EventSourceResponse:
    """Accept a clip range + question, stream AI analysis as SSE."""
    duration = req.duration()
    if duration < settings.clip_min_seconds:
        raise HTTPException(
            status_code=400,
            detail=f"clip too short (min {settings.clip_min_seconds}s)",
        )
    if duration >= 15 or duration > settings.clip_max_seconds:
        raise HTTPException(
            status_code=400,
            detail=f"clip too long (max {settings.clip_max_seconds}s)",
        )

    async def event_stream():
        clip_path = None
        yield {
            "event": "stage",
            "data": json.dumps({"stage": "received", "duration_sec": duration}),
        }
        try:
            yield {"event": "stage", "data": json.dumps({"stage": "extract"})}
            clip_path = extract_youtube_clip(req.video_id, req.start_sec, req.end_sec)

            yield {
                "event": "stage",
                "data": json.dumps(
                    {
                        "stage": "upload",
                        "provider": settings.ai_provider,
                        "bytes": clip_path.stat().st_size,
                    }
                ),
            }

            yield {"event": "stage", "data": json.dumps({"stage": "analyze"})}
            wrote_token = False
            for token in analyze_clip(clip_path, req.question):
                wrote_token = True
                yield {"event": "token", "data": json.dumps({"text": token})}

            if not wrote_token:
                yield {
                    "event": "token",
                    "data": json.dumps({"text": "AI가 빈 응답을 반환했습니다."}),
                }
            yield {"event": "done", "data": json.dumps({"ok": True})}
        except Exception as exc:
            yield {
                "event": "error",
                "data": json.dumps({"message": str(exc), "type": type(exc).__name__}),
            }
        finally:
            if clip_path is not None:
                shutil.rmtree(clip_path.parent, ignore_errors=True)

    return EventSourceResponse(event_stream())
