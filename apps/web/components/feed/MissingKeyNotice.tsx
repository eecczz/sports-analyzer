export function MissingKeyNotice({ detail }: { detail?: string }) {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
      <h2 className="mb-2 font-semibold">YouTube API 키가 필요합니다</h2>
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          <a
            className="underline"
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Cloud Console
          </a>
          에서 프로젝트 생성 후 API 키 발급
        </li>
        <li>
          &quot;YouTube Data API v3&quot;를{" "}
          <a
            className="underline"
            href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Library
          </a>
          에서 사용설정
        </li>
        <li>
          프로젝트 루트의 <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">.env.local</code>에{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">YT_API_KEY=...</code> 추가
        </li>
        <li>개발 서버 재시작</li>
      </ol>
      {detail ? (
        <pre className="mt-3 overflow-auto rounded bg-amber-100 p-2 text-xs dark:bg-amber-900/60">
          {detail}
        </pre>
      ) : null}
    </div>
  );
}
