import { describe, expect, it, vi } from "vitest";
import { formatDuration, formatRelative, formatViews } from "./format";

describe("formatDuration", () => {
  it("returns 0:00 for zero or negative", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(-1)).toBe("0:00");
  });

  it("formats seconds under a minute", () => {
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(59)).toBe("0:59");
  });

  it("formats minutes:seconds below an hour", () => {
    expect(formatDuration(60)).toBe("1:00");
    expect(formatDuration(125)).toBe("2:05");
  });

  it("formats h:mm:ss when an hour or more", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3661)).toBe("1:01:01");
  });
});

describe("formatViews", () => {
  it("uses 회 for small numbers", () => {
    expect(formatViews(0)).toBe("0회");
    expect(formatViews(999)).toBe("999회");
  });

  it("uses 천회 for thousands", () => {
    expect(formatViews(1500)).toBe("1.5천회");
  });

  it("uses 만회 for tens of thousands", () => {
    expect(formatViews(15000)).toBe("1.5만회");
    expect(formatViews(100_000)).toBe("10.0만회");
  });

  it("uses 억회 for hundreds of millions", () => {
    expect(formatViews(100_000_000)).toBe("1.0억회");
    expect(formatViews(250_000_000)).toBe("2.5억회");
  });
});

describe("formatRelative", () => {
  it("returns empty string for invalid input", () => {
    expect(formatRelative("")).toBe("");
    expect(formatRelative("not-a-date")).toBe("");
  });

  it("returns 방금 전 for very recent dates", () => {
    vi.useFakeTimers();
    const now = new Date("2026-04-24T12:00:00Z");
    vi.setSystemTime(now);
    const thirtySecondsAgo = new Date(now.getTime() - 30_000).toISOString();
    expect(formatRelative(thirtySecondsAgo)).toBe("방금 전");
    vi.useRealTimers();
  });

  it("returns N분 전 for minutes", () => {
    vi.useFakeTimers();
    const now = new Date("2026-04-24T12:00:00Z");
    vi.setSystemTime(now);
    const tenMinAgo = new Date(now.getTime() - 10 * 60_000).toISOString();
    expect(formatRelative(tenMinAgo)).toBe("10분 전");
    vi.useRealTimers();
  });

  it("returns N일 전 for days", () => {
    vi.useFakeTimers();
    const now = new Date("2026-04-24T12:00:00Z");
    vi.setSystemTime(now);
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 3600_000).toISOString();
    expect(formatRelative(fiveDaysAgo)).toBe("5일 전");
    vi.useRealTimers();
  });

  it("returns N년 전 for years", () => {
    vi.useFakeTimers();
    const now = new Date("2026-04-24T12:00:00Z");
    vi.setSystemTime(now);
    const threeYearsAgo = new Date(now.getTime() - 3 * 365 * 24 * 3600_000).toISOString();
    expect(formatRelative(threeYearsAgo)).toBe("3년 전");
    vi.useRealTimers();
  });
});
