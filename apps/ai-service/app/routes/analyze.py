import json
import shutil

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.core.config import settings
from app.schemas import AnalyzeRequest
from app.services.ai import analyze_clip
from app.services.clip import extract_youtube_clip
from app.services.history import (
    append_analysis_answer,
    recent_analysis_traces,
    start_analysis_trace,
    update_analysis_trace,
)

router = APIRouter(tags=["analyze"])


def sse_json(payload: dict) -> str:
    return json.dumps(payload, ensure_ascii=False)


@router.post(
    "/analyze",
    responses={
        200: {
            "description": "SSE stream of stage + token events",
            "content": {
                "text/event-stream": {
                    "example": (
                        'event: stage\ndata: {"stage":"extract"}\n\n'
                        'event: token\ndata: {"text":"analysis "}\n\n'
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

    trace_id = start_analysis_trace(
        video_id=req.video_id,
        start_sec=req.start_sec,
        end_sec=req.end_sec,
        question=req.question,
        video_title=req.video_title,
        channel_title=req.channel_title,
    )

    async def event_stream():
        clip_path = None
        yield {
            "event": "stage",
            "data": sse_json(
                {"stage": "received", "duration_sec": duration, "trace_id": trace_id}
            ),
        }
        try:
            update_analysis_trace(trace_id, status="extract")
            yield {"event": "stage", "data": sse_json({"stage": "extract"})}
            clip_path = extract_youtube_clip(req.video_id, req.start_sec, req.end_sec)
            clip_bytes = clip_path.stat().st_size
            update_analysis_trace(trace_id, status="upload", clip_bytes=clip_bytes)

            yield {
                "event": "stage",
                "data": sse_json(
                    {
                        "stage": "upload",
                        "provider": settings.ai_provider,
                        "bytes": clip_bytes,
                    }
                ),
            }

            update_analysis_trace(trace_id, status="analyze")
            yield {"event": "stage", "data": sse_json({"stage": "analyze"})}
            wrote_token = False
            for token in analyze_clip(
                clip_path,
                req.question,
                video_title=req.video_title,
                channel_title=req.channel_title,
            ):
                wrote_token = True
                append_analysis_answer(trace_id, token)
                yield {"event": "token", "data": sse_json({"text": token})}

            if not wrote_token:
                empty_text = "AI returned an empty response."
                append_analysis_answer(trace_id, empty_text)
                yield {"event": "token", "data": sse_json({"text": empty_text})}
            update_analysis_trace(trace_id, status="done")
            yield {"event": "done", "data": sse_json({"ok": True})}
        except Exception as exc:
            update_analysis_trace(
                trace_id,
                status="error",
                error={"message": str(exc), "type": type(exc).__name__},
            )
            yield {
                "event": "error",
                "data": sse_json({"message": str(exc), "type": type(exc).__name__}),
            }
        finally:
            if clip_path is not None:
                shutil.rmtree(clip_path.parent, ignore_errors=True)

    return EventSourceResponse(event_stream())


@router.get("/debug/analyze-history")
async def analyze_history() -> list[dict]:
    """Return recent local analysis traces for debugging the development app."""
    return recent_analysis_traces()
