import { google, youtube_v3 } from "googleapis";
import { env, requireYtKey } from "./env";

export interface VideoSummary {
  id: string;
  title: string;
  channelId: string;
  channelTitle: string;
  thumbnail: string;
  publishedAt: string;
  viewCount: number;
  durationSec: number;
}

const SPORTS_CATEGORY_ID = "17";

function client(): youtube_v3.Youtube {
  return google.youtube({ version: "v3", auth: requireYtKey() });
}

function parseIsoDuration(iso: string): number {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);
  if (!m) return 0;
  const [, h, min, s] = m;
  return (Number(h ?? 0) * 3600) + (Number(min ?? 0) * 60) + Number(s ?? 0);
}

function thumb(thumbs: youtube_v3.Schema$ThumbnailDetails | undefined): string {
  return (
    thumbs?.maxres?.url ??
    thumbs?.standard?.url ??
    thumbs?.high?.url ??
    thumbs?.medium?.url ??
    thumbs?.default?.url ??
    ""
  );
}

function toSummary(v: youtube_v3.Schema$Video): VideoSummary {
  return {
    id: v.id ?? "",
    title: v.snippet?.title ?? "",
    channelId: v.snippet?.channelId ?? "",
    channelTitle: v.snippet?.channelTitle ?? "",
    thumbnail: thumb(v.snippet?.thumbnails),
    publishedAt: v.snippet?.publishedAt ?? "",
    viewCount: Number(v.statistics?.viewCount ?? 0),
    durationSec: parseIsoDuration(v.contentDetails?.duration ?? ""),
  };
}

export async function trendingSports(maxResults = 24): Promise<VideoSummary[]> {
  const yt = client();
  const res = await yt.videos.list({
    part: ["snippet", "statistics", "contentDetails"],
    chart: "mostPopular",
    videoCategoryId: SPORTS_CATEGORY_ID,
    regionCode: env.YT_REGION,
    maxResults,
  });
  return (res.data.items ?? []).map(toSummary);
}

export async function searchSports(
  query: string,
  maxResults = 24
): Promise<VideoSummary[]> {
  const yt = client();
  const search = await yt.search.list({
    part: ["snippet"],
    q: query,
    type: ["video"],
    videoCategoryId: SPORTS_CATEGORY_ID,
    regionCode: env.YT_REGION,
    maxResults,
    safeSearch: "none",
  });
  const ids = (search.data.items ?? [])
    .map((it) => it.id?.videoId)
    .filter((x): x is string => Boolean(x));
  if (ids.length === 0) return [];
  const detail = await yt.videos.list({
    part: ["snippet", "statistics", "contentDetails"],
    id: ids,
  });
  return (detail.data.items ?? []).map(toSummary);
}

export async function videoMeta(id: string): Promise<VideoSummary | null> {
  const yt = client();
  const res = await yt.videos.list({
    part: ["snippet", "statistics", "contentDetails"],
    id: [id],
  });
  const item = res.data.items?.[0];
  return item ? toSummary(item) : null;
}
