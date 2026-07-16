from __future__ import annotations

from collections import deque
from datetime import UTC, datetime
from threading import Lock
from typing import Any
from uuid import uuid4

_history: deque[dict[str, Any]] = deque(maxlen=20)
_lock = Lock()


def start_analysis_trace(
    *,
    video_id: str,
    start_sec: float,
    end_sec: float,
    question: str,
    video_title: str | None,
    channel_title: str | None,
) -> str:
    trace_id = uuid4().hex
    with _lock:
        _history.appendleft(
            {
                "id": trace_id,
                "created_at": datetime.now(UTC).isoformat(),
                "video_id": video_id,
                "video_title": video_title,
                "channel_title": channel_title,
                "start_sec": start_sec,
                "end_sec": end_sec,
                "duration_sec": max(0.0, end_sec - start_sec),
                "question": question,
                "status": "received",
                "clip_bytes": None,
                "answer": "",
                "error": None,
            }
        )
    return trace_id


def update_analysis_trace(trace_id: str, **fields: Any) -> None:
    with _lock:
        for item in _history:
            if item["id"] == trace_id:
                item.update(fields)
                return


def append_analysis_answer(trace_id: str, text: str) -> None:
    with _lock:
        for item in _history:
            if item["id"] == trace_id:
                item["answer"] = f"{item.get('answer', '')}{text}"
                return


def recent_analysis_traces() -> list[dict[str, Any]]:
    with _lock:
        return [dict(item) for item in _history]
