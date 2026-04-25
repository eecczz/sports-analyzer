import Image from "next/image";
import Link from "next/link";
import type { VideoSummary } from "@/lib/youtube";
import { formatDuration, formatRelative, formatViews } from "@/lib/format";

export function VideoCard({ video }: { video: VideoSummary }) {
  return (
    <Link
      href={`/watch/${video.id}`}
      className="group flex flex-col gap-3 rounded-xl overflow-hidden"
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800">
        {video.thumbnail ? (
          <Image
            src={video.thumbnail}
            alt={video.title}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover transition-transform group-hover:scale-[1.02]"
          />
        ) : null}
        {video.durationSec > 0 && (
          <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
            {formatDuration(video.durationSec)}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 px-1">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
          {video.title}
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {video.channelTitle}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {formatViews(video.viewCount)} · {formatRelative(video.publishedAt)}
        </p>
      </div>
    </Link>
  );
}
