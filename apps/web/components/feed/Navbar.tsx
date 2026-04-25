import Link from "next/link";
import { Suspense } from "react";
import { SearchBox } from "./SearchBox";

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-6 border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur md:px-6 dark:border-zinc-800 dark:bg-zinc-950/80">
      <Link href="/" className="flex items-center gap-2">
        <span className="inline-block h-6 w-6 rounded bg-gradient-to-br from-orange-500 to-red-600" />
        <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Clip<span className="text-orange-500">Analyst</span>
        </span>
      </Link>
      <Suspense fallback={<div className="flex-1" />}>
        <SearchBox />
      </Suspense>
      <span className="hidden text-xs text-zinc-500 sm:inline dark:text-zinc-400">
        스포츠 자세 분석 전용
      </span>
    </header>
  );
}
