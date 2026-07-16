import { Navbar } from "@/components/feed/Navbar";
import { env } from "@/lib/env";
import { videoMeta } from "@/lib/youtube";
import { WatchExperience } from "./watch-experience";

export const dynamic = "force-dynamic";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const { videoId } = await params;
  const video = env.YT_API_KEY ? await videoMeta(videoId) : null;

  return (
    <>
      <Navbar />
      <main className="mx-auto grid w-full max-w-[1800px] gap-5 px-4 py-5 xl:grid-cols-[minmax(0,1fr)_430px]">
        <WatchExperience videoId={videoId} initialVideo={video} />
      </main>
    </>
  );
}
