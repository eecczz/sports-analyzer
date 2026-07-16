from __future__ import annotations

import base64
import mimetypes
import time
from collections.abc import Iterator
from pathlib import Path

from google import genai
from google.genai import types
from openai import OpenAI

from app.core.config import require_provider_key, settings

SYSTEM_PROMPT = (
    "You are a sports technique analyst. Answer in Korean. "
    "Focus only on what can be inferred from the supplied clip. "
    "When discussing posture, describe body alignment, timing, balance, force transfer, "
    "and likely tactical intent. If the question is unrelated to sports, politely refuse."
)


def analyze_clip(path: Path, question: str) -> Iterator[str]:
    if settings.ai_provider == "gemini":
        yield from _analyze_with_gemini(path, question)
        return
    if settings.ai_provider == "kimi":
        yield from _analyze_with_kimi(path, question)
        return
    raise RuntimeError(f"Unsupported AI_PROVIDER: {settings.ai_provider}")


def _analyze_with_gemini(path: Path, question: str) -> Iterator[str]:
    client = genai.Client(api_key=require_provider_key())
    uploaded = client.files.upload(file=path)
    for _ in range(30):
        file_state = getattr(uploaded, "state", None)
        state_name = getattr(file_state, "name", str(file_state))
        if state_name == "ACTIVE":
            break
        if state_name == "FAILED":
            raise RuntimeError("Gemini file upload processing failed")
        time.sleep(1)
        uploaded = client.files.get(name=uploaded.name)
    else:
        raise RuntimeError("Gemini file upload did not become ACTIVE in time")

    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"User question: {question}\n\n"
        "Only inspect the selected short clip. Explain the athlete's posture, "
        "movement timing, balance, force transfer, and likely tactical intent."
    )
    stream = client.models.generate_content_stream(
        model=settings.gemini_model,
        contents=[uploaded, types.Part.from_text(text=prompt)],
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.3,
            max_output_tokens=1200,
        ),
    )
    for chunk in stream:
        text = getattr(chunk, "text", None)
        if text:
            yield text


def _analyze_with_kimi(path: Path, question: str) -> Iterator[str]:
    client = OpenAI(
        api_key=require_provider_key(),
        base_url="https://api.moonshot.ai/v1",
    )
    mime_type = mimetypes.guess_type(path.name)[0] or "video/mp4"
    video_data = base64.b64encode(path.read_bytes()).decode("utf-8")
    video_url = f"data:{mime_type};base64,{video_data}"
    response = client.chat.completions.create(
        model=settings.kimi_model,
        stream=True,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "video_url", "video_url": {"url": video_url}},
                    {
                        "type": "text",
                        "text": (
                            f"User question: {question}\n\n"
                            "Only inspect this selected clip. Explain the athlete's posture, "
                            "movement timing, balance, force transfer, and likely tactical intent."
                        ),
                    },
                ],
            },
        ],
        extra_body={"thinking": {"type": "disabled"}},
    )
    for chunk in response:
        piece = chunk.choices[0].delta.content
        if piece:
            yield piece
