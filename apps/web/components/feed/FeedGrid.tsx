import type { VideoSummary } from "@/lib/youtube";
import { VideoCard } from "./VideoCard";

export function FeedGrid({ videos }: { videos: VideoSummary[] }) {
  if (videos.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        표시할 영상이 없습니다.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {videos.map((v) => (
        <VideoCard key={v.id} video={v} />
      ))}
    </div>
  );
}
