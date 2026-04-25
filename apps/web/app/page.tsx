import { FeedGrid } from "@/components/feed/FeedGrid";
import { MissingKeyNotice } from "@/components/feed/MissingKeyNotice";
import { Navbar } from "@/components/feed/Navbar";
import { env } from "@/lib/env";
import { trendingSports } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!env.YT_API_KEY) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
          <MissingKeyNotice />
        </main>
      </>
    );
  }

  let videos;
  let error: string | undefined;
  try {
    videos = await trendingSports(24);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6">
        <section className="mb-4 flex items-baseline justify-between">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            스포츠 트렌딩
          </h1>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            KR · YouTube
          </span>
        </section>
        {error ? (
          <MissingKeyNotice detail={error} />
        ) : (
          <FeedGrid videos={videos ?? []} />
        )}
      </main>
    </>
  );
}
