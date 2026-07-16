from __future__ import annotations

import tempfile
from pathlib import Path
from shutil import which

import yt_dlp
from yt_dlp import utils


def _ffmpeg_location() -> str | None:
    ffmpeg = which("ffmpeg")
    if ffmpeg:
        return str(Path(ffmpeg).parent)

    winget_packages = Path.home() / "AppData/Local/Microsoft/WinGet/Packages"
    matches = list(winget_packages.glob("Gyan.FFmpeg_*/*/bin/ffmpeg.exe"))
    if matches:
        return str(matches[0].parent)

    return None


def extract_youtube_clip(video_id: str, start_sec: float, end_sec: float) -> Path:
    """Download only the requested YouTube range into a temporary mp4 file."""
    temp_dir = Path(tempfile.mkdtemp(prefix="clipanalyst-"))
    outtmpl = str(temp_dir / "%(id)s.%(ext)s")
    url = f"https://www.youtube.com/watch?v={video_id}"

    options = {
        "format": "bv*[height<=720]+ba/b[height<=720]/b",
        "outtmpl": outtmpl,
        "merge_output_format": "mp4",
        "download_ranges": utils.download_range_func(None, [(start_sec, end_sec)]),
        "force_keyframes_at_cuts": True,
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
    }
    ffmpeg_location = _ffmpeg_location()
    if ffmpeg_location:
        options["ffmpeg_location"] = ffmpeg_location

    with yt_dlp.YoutubeDL(options) as ydl:
        info = ydl.extract_info(url, download=True)
        requested = info.get("requested_downloads") or []
        candidates = [item.get("filepath") for item in requested if item.get("filepath")]
        candidates.extend(str(path) for path in temp_dir.glob("*.mp4"))
        for candidate in candidates:
            path = Path(candidate)
            if path.exists() and path.stat().st_size > 0:
                return path

    raise RuntimeError("clip extraction completed but no mp4 file was produced")
