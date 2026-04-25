import { FeedGrid } from "@/components/feed/FeedGrid";
import { MissingKeyNotice } from "@/components/feed/MissingKeyNotice";
import { Navbar } from "@/components/feed/Navbar";
import { env } from "@/lib/env";
import { searchSports } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;

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
  if (q.trim()) {
    try {
      videos = await searchSports(q.trim(), 24);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6">
        <section className="mb-4">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {q ? `"${q}" 검색 결과` : "검색어를 입력하세요"}
          </h1>
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
