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
    "and likely tactical intent. If the question is unrelated to sports, politely refuse. "
    "Format every answer for readability: start with a short direct conclusion, then use "
    "brief Markdown sections and bullet points. Keep paragraphs short. If the requested "
    "event is not visible in the clip, say that first and do not invent identities. "
    "For soccer questions about shooting, scoring, defending, or a specific player action, "
    "answer the event question before posture analysis."
)


def analyze_clip(
    path: Path,
    question: str,
    *,
    video_title: str | None = None,
    channel_title: str | None = None,
) -> Iterator[str]:
    if settings.ai_provider == "gemini":
        yield from _analyze_with_gemini(
            path,
            question,
            video_title=video_title,
            channel_title=channel_title,
        )
        return
    if settings.ai_provider == "kimi":
        yield from _analyze_with_kimi(
            path,
            question,
            video_title=video_title,
            channel_title=channel_title,
        )
        return
    raise RuntimeError(f"Unsupported AI_PROVIDER: {settings.ai_provider}")


def _context_text(video_title: str | None, channel_title: str | None) -> str:
    parts = []
    if video_title:
        parts.append(f"Video title: {video_title}")
    if channel_title:
        parts.append(f"Channel: {channel_title}")
    return "\n".join(parts)


def _analysis_instruction(
    question: str,
    video_title: str | None,
    channel_title: str | None,
) -> str:
    context = _context_text(video_title, channel_title)
    return (
        f"{SYSTEM_PROMPT}\n\n"
        f"{context}\n\n"
        f"User question: {question}\n\n"
        "Inspect only the selected clip, but answer the user's exact question first. "
        "If the question asks who shot, scored, passed, defended, or committed an action, "
        "look for that action sequence before posture analysis. If a real name is not visible "
        "or not inferable from the clip/title, identify the player by visible team color, "
        "uniform number, location, or role. If a shot or goal motion is visible, explicitly "
        "describe the kicking or shooting motion. If the requested event is truly outside the "
        "selected clip, say that in the first sentence and describe what moment is visible. "
        "Use concise Korean Markdown with a short conclusion, headings, and bullets."
    )


def _analyze_with_gemini(
    path: Path,
    question: str,
    *,
    video_title: str | None,
    channel_title: str | None,
) -> Iterator[str]:
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

    prompt = _analysis_instruction(question, video_title, channel_title)
    stream = client.models.generate_content_stream(
        model=settings.gemini_model,
        contents=[uploaded, types.Part.from_text(text=prompt)],
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.3,
            max_output_tokens=2400,
        ),
    )
    for chunk in stream:
        text = getattr(chunk, "text", None)
        if text:
            yield text


def _analyze_with_kimi(
    path: Path,
    question: str,
    *,
    video_title: str | None,
    channel_title: str | None,
) -> Iterator[str]:
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
                        "text": _analysis_instruction(
                            question,
                            video_title,
                            channel_title,
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
