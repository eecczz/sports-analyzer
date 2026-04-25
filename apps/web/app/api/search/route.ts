import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { searchSports } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return Response.json(
      { error: "query parameter 'q' is required", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const limitRaw = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitRaw ?? 24) || 24, 1), 50);

  if (!env.YT_API_KEY) {
    return Response.json(
      { error: "YT_API_KEY is not set", code: "MISSING_ENV" },
      { status: 500 }
    );
  }

  try {
    const videos = await searchSports(q, limit);
    return Response.json(videos);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return Response.json({ error: message, code: "UPSTREAM" }, { status: 502 });
  }
}
