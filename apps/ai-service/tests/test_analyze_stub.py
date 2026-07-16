import json

from fastapi.testclient import TestClient

from app.main import app


def _parse_sse(body: str) -> list[dict]:
    """Parse an SSE response body into a list of {event, data} dicts."""
    events: list[dict] = []
    current: dict = {}
    for line in body.splitlines():
        if line.startswith("event:"):
            current["event"] = line.split(":", 1)[1].strip()
        elif line.startswith("data:"):
            current["data"] = line.split(":", 1)[1].strip()
        elif not line and current:
            events.append(current)
            current = {}
    if current:
        events.append(current)
    return events


def test_analyze_rejects_too_short_clip():
    client = TestClient(app)
    res = client.post(
        "/analyze",
        json={
            "video_id": "abc",
            "start_sec": 0,
            "end_sec": 0.5,
            "question": "test",
        },
    )
    assert res.status_code == 400
    assert "too short" in res.json()["detail"]


def test_analyze_rejects_too_long_clip():
    client = TestClient(app)
    res = client.post(
        "/analyze",
        json={
            "video_id": "abc",
            "start_sec": 0,
            "end_sec": 120,
            "question": "test",
        },
    )
    assert res.status_code == 400
    assert "too long" in res.json()["detail"]


def test_analyze_rejects_15_second_clip():
    client = TestClient(app)
    res = client.post(
        "/analyze",
        json={
            "video_id": "abc",
            "start_sec": 0,
            "end_sec": 15,
            "question": "test",
        },
    )
    assert res.status_code == 400
    assert "too long" in res.json()["detail"]


def test_analyze_stub_streams_sse():
    client = TestClient(app)
    with client.stream(
        "POST",
        "/analyze",
        json={
            "video_id": "abc",
            "start_sec": 0,
            "end_sec": 5,
            "question": "왜 이 자세를 취하는가?",
        },
    ) as res:
        assert res.status_code == 200
        assert res.headers["content-type"].startswith("text/event-stream")
        body = b"".join(res.iter_bytes()).decode()

    events = _parse_sse(body)
    assert len(events) >= 2
    assert events[0]["event"] == "stage"
    payload = json.loads(events[0]["data"])
    assert payload["stage"] == "received"
    assert payload["duration_sec"] == 5


def test_analyze_rejects_blank_question():
    client = TestClient(app)
    res = client.post(
        "/analyze",
        json={
            "video_id": "abc",
            "start_sec": 0,
            "end_sec": 5,
            "question": "",
        },
    )
    assert res.status_code == 422
