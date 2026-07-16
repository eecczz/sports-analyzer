import { env } from "@/lib/env";
import { videoMeta } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params;

  if (!env.YT_API_KEY) {
    return Response.json(
      { error: "YT_API_KEY is not set", code: "MISSING_ENV" },
      { status: 500 }
    );
  }

  try {
    const video = await videoMeta(videoId);
    if (!video) {
      return Response.json(
        { error: "video not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    return Response.json(video);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return Response.json({ error: message, code: "UPSTREAM" }, { status: 502 });
  }
}
