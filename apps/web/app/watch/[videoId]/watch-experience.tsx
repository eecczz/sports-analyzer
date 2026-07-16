"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { formatDuration, formatViews } from "@/lib/format";
import type { VideoSummary } from "@/lib/youtube";

declare global {
  interface Window {
    YT?: {
      Player: new (
        id: string,
        options: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: { target: YtPlayer }) => void;
            onStateChange?: (event: { data: number }) => void;
          };
        }
      ) => YtPlayer;
      PlayerState?: { PLAYING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YtPlayer {
  playVideo?: () => void;
  pauseVideo?: () => void;
  seekTo?: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime?: () => number;
  getDuration?: () => number;
  getVolume?: () => number;
  setVolume?: (volume: number) => void;
  mute?: () => void;
  unMute?: () => void;
  isMuted?: () => boolean;
  setPlaybackRate?: (rate: number) => void;
}

type ChatMessage = {
  role: "user" | "assistant" | "system";
  text: string;
};

type Stage = {
  stage: string;
  message?: string;
};

const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
const MAX_CLIP_SECONDS = 14.9;
const MIN_CLIP_SECONDS = 1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseSseChunk(buffer: string): {
  events: Array<{ event: string; data: string }>;
  rest: string;
} {
  const events: Array<{ event: string; data: string }> = [];
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  for (const part of parts) {
    let event = "message";
    const data: string[] = [];
    for (const line of part.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) data.push(line.slice(5).trim());
    }
    events.push({ event, data: data.join("\n") });
  }
  return { events, rest };
}

function canReadTime(player: YtPlayer | null): boolean {
  return Boolean(player?.getCurrentTime && player.getDuration);
}

function clipEndLimit(start: number, total: number): number {
  return Math.min(total, start + MAX_CLIP_SECONDS);
}

function clipStartLimit(end: number): number {
  return Math.max(0, end - MAX_CLIP_SECONDS);
}

export function WatchExperience({
  videoId,
  initialVideo,
}: {
  videoId: string;
  initialVideo: VideoSummary | null;
}) {
  const playerRef = useRef<YtPlayer | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(initialVideo?.durationSec ?? 0);
  const [current, setCurrent] = useState(0);
  const [volume, setVolume] = useState(70);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [clipMode, setClipMode] = useState(false);
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(
    Math.min(initialVideo?.durationSec ?? 10, 10)
  );
  const [dragging, setDragging] = useState<"current" | "start" | "end" | null>(
    null
  );
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "system",
      text: "Set a clip under 15 seconds, then ask about posture or tactics.",
    },
  ]);
  const [stage, setStage] = useState<Stage | null>(null);
  const [asking, setAsking] = useState(false);

  const video = initialVideo;
  const clipDuration = Math.max(0, clipEnd - clipStart);
  const currentPct = duration ? (current / duration) * 100 : 0;
  const startPct = duration ? (clipStart / duration) * 100 : 0;
  const endPct = duration ? (clipEnd / duration) * 100 : 0;
  const clipTooLong = clipDuration >= 15;

  useEffect(() => {
    let cancelled = false;

    const boot = () => {
      if (!window.YT?.Player || cancelled) return;
      playerRef.current = new window.YT.Player("yt-player", {
        videoId,
        playerVars: {
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: (event) => {
            const player = event.target;
            const total = player.getDuration?.() ?? initialVideo?.durationSec ?? 0;
            setDuration(total);
            setVolume(player.getVolume?.() ?? 70);
            setMuted(player.isMuted?.() ?? false);
            playerRef.current = player;
            setReady(true);
          },
          onStateChange: (event) => {
            setPlaying(event.data === window.YT?.PlayerState?.PLAYING);
          },
        },
      });
    };

    if (window.YT?.Player) {
      boot();
    } else {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        boot();
      };
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [initialVideo?.durationSec, videoId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const player = playerRef.current;
      if (!canReadTime(player)) return;
      const getCurrentTime = player?.getCurrentTime;
      const getDuration = player?.getDuration;
      if (!getCurrentTime || !getDuration) return;
      setCurrent(getCurrentTime() || 0);
      const total = getDuration();
      if (total) setDuration(total);
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!dragging || !barRef.current || !duration) return;
      const rect = barRef.current.getBoundingClientRect();
      const seconds = clamp(
        ((event.clientX - rect.left) / rect.width) * duration,
        0,
        duration
      );
      if (dragging === "current") {
        setCurrent(seconds);
        playerRef.current?.seekTo?.(seconds, true);
      }
      if (dragging === "start") {
        const minStart = clipStartLimit(clipEnd);
        const maxStart = Math.max(0, clipEnd - MIN_CLIP_SECONDS);
        const next = clamp(seconds, minStart, maxStart);
        setClipStart(next);
        playerRef.current?.seekTo?.(next, true);
      }
      if (dragging === "end") {
        const minEnd = clipStart + MIN_CLIP_SECONDS;
        const maxEnd = clipEndLimit(clipStart, duration);
        setClipEnd(clamp(seconds, minEnd, maxEnd));
      }
    };
    const onUp = () => setDragging(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [clipEnd, clipStart, dragging, duration]);

  function togglePlay() {
    const player = playerRef.current;
    if (!player) return;
    if (playing) player.pauseVideo?.();
    else player.playVideo?.();
  }

  function seekBy(delta: number) {
    const next = clamp(current + delta, 0, duration);
    playerRef.current?.seekTo?.(next, true);
    setCurrent(next);
  }

  function toggleMute() {
    const player = playerRef.current;
    if (!player) return;
    if (muted) player.unMute?.();
    else player.mute?.();
    setMuted(!muted);
  }

  function updateVolume(value: number) {
    setVolume(value);
    playerRef.current?.setVolume?.(value);
    if (value > 0 && muted) {
      playerRef.current?.unMute?.();
      setMuted(false);
    }
  }

  function updateRate(value: number) {
    setRate(value);
    playerRef.current?.setPlaybackRate?.(value);
  }

  function enterClipMode() {
    const player = playerRef.current;
    const now = player?.getCurrentTime?.() ?? current;
    const start = clamp(now, 0, Math.max(0, duration - MIN_CLIP_SECONDS));
    const end = clamp(
      start + Math.min(10, Math.max(MIN_CLIP_SECONDS, duration - start)),
      start + MIN_CLIP_SECONDS,
      clipEndLimit(start, duration)
    );
    setClipStart(start);
    setClipEnd(end);
    setClipMode(true);
  }

  function jumpToClipStart() {
    playerRef.current?.seekTo?.(clipStart, true);
    setCurrent(clipStart);
  }

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || asking || !clipMode || clipTooLong) return;

    setAsking(true);
    setQuestion("");
    setStage({ stage: "sending" });
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: `[${formatDuration(clipStart)}-${formatDuration(clipEnd)}] ${trimmed}`,
      },
      { role: "assistant", text: "" },
    ]);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: videoId,
          start_sec: clipStart,
          end_sec: clipEnd,
          question: trimmed,
        }),
      });

      if (!response.ok || !response.body) {
        const text = await response.text();
        throw new Error(text || response.statusText);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSseChunk(buffer);
        buffer = parsed.rest;
        for (const item of parsed.events) {
          const data = item.data ? JSON.parse(item.data) : {};
          if (item.event === "stage") setStage(data);
          if (item.event === "token") {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              next[next.length - 1] = {
                ...last,
                text: `${last.text}${data.text ?? ""}`,
              };
              return next;
            });
          }
          if (item.event === "error") {
            throw new Error(data.message ?? "analysis failed");
          }
          if (item.event === "done") setStage({ stage: "done" });
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        next[next.length - 1] = {
          ...last,
          text: last.text || `Analysis failed: ${message}`,
        };
        return next;
      });
      setStage({ stage: "error", message });
    } finally {
      setAsking(false);
    }
  }

  const stageLabel = useMemo(() => {
    if (!stage) return "";
    const labels: Record<string, string> = {
      sending: "Sending",
      received: "Received",
      extract: "Extracting clip",
      upload: "Uploading to AI",
      analyze: "Analyzing",
      done: "Done",
      error: "Error",
    };
    return labels[stage.stage] ?? stage.stage;
  }, [stage]);

  return (
    <>
      <section className="min-w-0">
        <div className="overflow-hidden rounded-lg border border-zinc-800 bg-black">
          <div className="group relative aspect-video bg-black">
            <div id="yt-player" className="h-full w-full" />
            {!ready ? (
              <div className="absolute inset-0 grid place-items-center text-sm text-zinc-400">
                Preparing player
              </div>
            ) : null}

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-4 pb-3 pt-16 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
              <div
                ref={barRef}
                className="relative h-8 cursor-pointer"
                onPointerDown={(event) => {
                  if (!barRef.current || !duration || clipMode) return;
                  const rect = barRef.current.getBoundingClientRect();
                  const seconds = clamp(
                    ((event.clientX - rect.left) / rect.width) * duration,
                    0,
                    duration
                  );
                  playerRef.current?.seekTo?.(seconds, true);
                  setCurrent(seconds);
                  setDragging("current");
                }}
              >
                <div className="absolute top-3 h-1 w-full rounded bg-white/25" />
                {!clipMode ? (
                  <>
                    <div
                      className="absolute top-3 h-1 rounded bg-red-500"
                      style={{ width: `${currentPct}%` }}
                    />
                    <button
                      type="button"
                      aria-label="current playback position"
                      className="absolute top-1.5 h-4 w-4 -translate-x-1/2 rounded-full bg-red-500 shadow"
                      style={{ left: `${currentPct}%` }}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        setDragging("current");
                      }}
                    />
                  </>
                ) : (
                  <>
                    <div
                      className="absolute top-3 h-1 rounded bg-emerald-400"
                      style={{
                        left: `${startPct}%`,
                        width: `${Math.max(0, endPct - startPct)}%`,
                      }}
                    />
                    <button
                      type="button"
                      aria-label="clip start"
                      className="absolute top-1 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-emerald-400 shadow"
                      style={{ left: `${startPct}%` }}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        setDragging("start");
                      }}
                    />
                    <button
                      type="button"
                      aria-label="clip end"
                      className="absolute top-1 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-sky-400 shadow"
                      style={{ left: `${endPct}%` }}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        setDragging("end");
                      }}
                    />
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-100">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="grid h-9 w-9 place-items-center rounded bg-black/70"
                  aria-label={playing ? "pause" : "play"}
                >
                  {playing ? "II" : ">"}
                </button>
                <button
                  type="button"
                  onClick={() => seekBy(-5)}
                  className="grid h-9 w-9 place-items-center rounded bg-black/70"
                  aria-label="back 5 seconds"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => seekBy(5)}
                  className="grid h-9 w-9 place-items-center rounded bg-black/70"
                  aria-label="forward 5 seconds"
                >
                  +5
                </button>
                <span className="tabular-nums text-zinc-200">
                  {formatDuration(current)} / {formatDuration(duration)}
                </span>
                <button
                  type="button"
                  onClick={toggleMute}
                  className="grid h-9 w-9 place-items-center rounded bg-black/70"
                  aria-label={muted ? "unmute" : "mute"}
                >
                  {muted ? "M" : "V"}
                </button>
                <input
                  aria-label="volume"
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(event) => updateVolume(Number(event.target.value))}
                  className="w-24 accent-orange-500"
                />
                <select
                  aria-label="playback speed"
                  value={rate}
                  onChange={(event) => updateRate(Number(event.target.value))}
                  className="h-9 rounded border border-white/15 bg-black/70 px-2 text-sm"
                >
                  {rates.map((item) => (
                    <option key={item} value={item}>
                      {item}x
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={enterClipMode}
                  className="h-9 rounded bg-emerald-500 px-3 text-sm font-semibold text-black"
                >
                  Set clip
                </button>
                {clipMode ? (
                  <button
                    type="button"
                    onClick={jumpToClipStart}
                    className="h-9 rounded bg-black/70 px-3 text-sm"
                  >
                    Jump to clip
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h1 className="text-xl font-bold text-zinc-50">
            {video?.title ?? "Video metadata unavailable"}
          </h1>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-zinc-400">
            <span>{video?.channelTitle ?? videoId}</span>
            {video ? <span>{formatViews(video.viewCount)}</span> : null}
            {clipMode ? (
              <span className="text-emerald-300">
                Clip {formatDuration(clipStart)} - {formatDuration(clipEnd)} (
                {formatDuration(clipDuration)}, max &lt; 0:15)
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <aside className="flex min-h-[640px] flex-col rounded-lg border border-zinc-800 bg-zinc-950">
        <div className="border-b border-zinc-800 px-4 py-3">
          <h2 className="text-base font-bold text-zinc-50">AI posture analysis</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Only the selected sub-15-second clip is sent to the configured AI provider.
          </p>
        </div>
        <div className="flex-1 space-y-3 overflow-auto px-4 py-4">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={
                message.role === "user"
                  ? "ml-8 rounded bg-orange-600 px-3 py-2 text-sm text-white"
                  : message.role === "assistant"
                    ? "mr-8 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                    : "rounded border border-zinc-800 bg-black px-3 py-2 text-xs text-zinc-400"
              }
            >
              {message.text || "Waiting for analysis..."}
            </div>
          ))}
        </div>
        <form onSubmit={ask} className="border-t border-zinc-800 p-4">
          {stageLabel ? (
            <div className="mb-2 text-xs text-zinc-400">
              Status: <span className="text-emerald-300">{stageLabel}</span>
              {stage?.message ? ` - ${stage.message}` : ""}
            </div>
          ) : null}
          {clipMode ? (
            <div className="mb-2 text-xs text-zinc-500">
              Selected clip must stay below 15 seconds.
            </div>
          ) : null}
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Example: Explain the player's posture and timing in this attack."
            className="w-full resize-none rounded border border-zinc-700 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-orange-500"
          />
          <button
            type="submit"
            disabled={!clipMode || !question.trim() || asking || clipTooLong}
            className="mt-3 h-10 w-full rounded bg-orange-600 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-zinc-700"
          >
            Ask about selected clip
          </button>
        </form>
      </aside>
    </>
  );
}
