export function formatDuration(sec: number): string {
  if (!sec || sec < 0) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatViews(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억회`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}만회`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}천회`;
  return `${n}회`;
}

export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (!then) return "";
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60_000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const month = Math.floor(day / 30);
  const year = Math.floor(day / 365);
  if (year >= 1) return `${year}년 전`;
  if (month >= 1) return `${month}개월 전`;
  if (day >= 1) return `${day}일 전`;
  if (hr >= 1) return `${hr}시간 전`;
  if (min >= 1) return `${min}분 전`;
  return "방금 전";
}
