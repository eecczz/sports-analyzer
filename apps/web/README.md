# apps/web — ClipAnalyst 프론트엔드

Next.js 16 + TypeScript + Tailwind. YouTube-스타일 탐색 UI와 시청/클립 선택 UI, ai-service로의 SSE 프록시를 담당.

> 루트 README: [../../README.md](../../README.md)
> 아키텍처: [../../docs/architecture.md](../../docs/architecture.md)

## 빠른 시작

```bash
npm install
cp .env.local.example .env.local    # YT_API_KEY 채우기
npm run dev                         # http://localhost:3000
```

OOM 발생 시:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

## 스크립트

| 명령 | 용도 |
|---|---|
| `npm run dev` | 개발 서버 (Turbopack) |
| `npm run build` | 프로덕션 빌드 (`output: 'standalone'`) |
| `npm run start` | 빌드된 프로덕션 서버 |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (run once) |
| `npm run test:watch` | Vitest watch 모드 |

## 환경변수

`.env.local` (git ignored):

- `YT_API_KEY` — YouTube Data API v3 키 (필수)
- `YT_REGION` — 트렌딩 지역 코드 (기본 `KR`)
- `AI_SERVICE_URL` — ai-service 주소 (기본 `http://localhost:8000`)

## 주요 경로

- 홈: `/` — 트렌딩 피드
- 검색: `/search?q=...`
- 시청: `/watch/[videoId]` *(M2에서 구현)*
- API 문서: `/docs` — Swagger UI (web 쪽 엔드포인트)
- OpenAPI: `/api/openapi.json`

## API 엔드포인트

- `GET /api/feed` — 트렌딩 Sports 영상
- `GET /api/search?q=...` — 검색
- `POST /api/analyze` — ai-service로 SSE 프록시 *(M4/M5)*
- `GET /api/history` — 챗 히스토리 프록시 *(M8)*
