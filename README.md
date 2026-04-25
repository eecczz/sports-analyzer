# ClipAnalyst

YouTube 스포츠 영상의 특정 구간을 **즉석에서 클립**하고, 해당 클립에 대한 질문을 **영상 이해 AI**(Gemini 3.1 Pro / Kimi K2.6)에게 보내 **자세·동작의 의도**를 설명받는 도구.

> 개인 사용 · localhost MVP. 배포·상업화 안 함.

---

## 🎯 핵심 기능

- **YouTube 스타일 피드**: 스포츠 카테고리 트렌딩 + 검색 + 개인화 추천 (로컬 시청기록 기반)
- **인-페이지 클립 선택기**: 듀얼-썸 슬라이더로 플레이어 타임라인에서 구간 지정
- **서버사이드 구간 추출**: yt-dlp `--download-sections` → ffmpeg 정규화 → AI 업로드
- **SSE 스트리밍 응답**: 분석 진행 단계 + AI 토큰을 실시간 렌더
- **AI Provider 스왑**: `.env` 한 줄로 Gemini ↔ Kimi 전환
- **Policy/Quality Gate**: 비-스포츠 질의 거절 + AI 응답 품질 검사

---

## 🏗️ 아키텍처 (MSA)

```
┌──────────────────┐    HTTP + SSE     ┌────────────────────┐
│  apps/web        │ ◄─────────────── │  apps/ai-service   │
│  Next.js 16      │                   │  FastAPI + Python  │
│  Port 3000       │                   │  Port 8000         │
│                  │                   │                    │
│  · Feed / Watch  │                   │  · yt-dlp (lib)    │
│  · Clip selector │                   │  · ffmpeg          │
│  · SSE proxy     │                   │  · Gemini / Kimi   │
│  · SQLite(web)   │                   │  · Policy/Quality  │
└────────┬─────────┘                   │  · SQLite(ai)      │
         │                              └─────────┬──────────┘
         │ IFrame + Data API v3                   │
         ▼                                        ▼
      YouTube                              Gemini / Kimi API
```

**서비스 분리 이유**: Python이 yt-dlp를 native 라이브러리로 임포트할 수 있고(셸아웃 오버헤드 0), Gemini SDK가 Python에서 더 성숙하며, 무거운 영상 처리를 UI 서버에서 분리해 OOM 리스크를 제거. 자세한 근거: [docs/architecture.md](./docs/architecture.md#11-아키텍처-결정-기록-adr-요약) ADR-007.

자세한 구조도 + 시퀀스 다이어그램은 [docs/architecture.md](./docs/architecture.md).

---

## 📋 요구사항

- **Node.js** ≥ 22 (권장 24 LTS)
- **Python** ≥ 3.12 (권장 3.13)
- **uv** (Python 패키지 매니저) — `pip install uv`
- **ffmpeg** — Windows: `scoop install ffmpeg` / macOS: `brew install ffmpeg`
- **Docker** (선택, docker-compose로 전체 실행 시)

---

## 🔑 API 키 준비

| 키 | 발급처 | 용도 | 필수 단계 |
|---|---|---|---|
| `YT_API_KEY` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (YouTube Data API v3 enable) | 영상 검색·트렌딩·메타 | M1부터 필요 |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) | AI 영상 분석 (primary) | M5부터 필요 |
| `MOONSHOT_API_KEY` | [Moonshot Platform](https://platform.moonshot.ai/) | AI 영상 분석 (swap, optional) | M6부터 (선택) |

> ⚠️ 모든 키는 각 서비스의 `.env*`에만 저장. git commit 금지 (`.gitignore`로 기본 차단).

---

## 🚀 실행 방법

### 옵션 A — 각 서비스 네이티브 실행 (개발 권장)

터미널 2개:

**터미널 1 (ai-service)**
```bash
cd apps/ai-service
cp .env.example .env
# .env 편집 → GEMINI_API_KEY=... 추가
uv sync
uv run uvicorn app.main:app --reload --port 8000
```
→ Swagger UI: http://localhost:8000/docs

**터미널 2 (web)**
```bash
cd apps/web
cp .env.local.example .env.local
# .env.local 편집 → YT_API_KEY=... 추가
npm install
npm run dev
```
→ 웹: http://localhost:3000

### 옵션 B — docker-compose (원-커맨드 데모)

각 `.env` 파일 채운 뒤:
```bash
docker-compose up --build
```
→ web: http://localhost:3000, ai-service: http://localhost:8000

---

## 🧪 테스트 및 품질 게이트

### web (Vitest + ESLint + tsc)
```bash
cd apps/web
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # Vitest
```

### ai-service (pytest + ruff + mypy)
```bash
cd apps/ai-service
uv run pytest        # 테스트
uv run ruff check .  # 린트
uv run mypy app      # 타입 체크
```

---

## 📁 프로젝트 구조

```
sports-clip-analyst/
├── apps/
│   ├── web/                   # Next.js 16 — 탐색 UI + SSE 프록시
│   │   ├── app/               # 라우트 (페이지 + API)
│   │   ├── components/        # Feed / Watch 컴포넌트
│   │   ├── lib/               # youtube, format, env, openapi, ...
│   │   └── Dockerfile
│   └── ai-service/            # FastAPI — 영상 + AI 파이프라인
│       ├── app/
│       │   ├── main.py
│       │   ├── routes/        # analyze, history, health
│       │   ├── services/      # clip, guard, ai/*
│       │   ├── db/            # SQLAlchemy
│       │   └── core/          # config
│       ├── tests/
│       └── Dockerfile
├── docs/
│   ├── requirements.md        # 요구명세서
│   └── architecture.md        # 구조도 + 시퀀스 + ERD + ADR
├── docker-compose.yml
└── README.md
```

---

## 🗺️ 로드맵 (마일스톤)

| # | 내용 | 상태 |
|---|---|---|
| M1 | Next.js 스켈레톤 + 트렌딩 피드 + 검색 | ✅ |
| M1.5 | MSA 재구조화 (web + ai-service) + Docker + TDD 베이스 | ✅ |
| M2 | 시청 페이지 + IFrame Player + 메타 API | 🔜 |
| M3 | ClipRangeSlider (듀얼-썸, 플레이어 동기화) | ⏳ |
| M4 | FastAPI `/analyze` — yt-dlp 라이브러리 + ffmpeg 정규화 | ⏳ |
| M5 | Gemini provider + Policy/Quality Gate + SSE 전체 체인 | ⏳ |
| M6 | Kimi provider swap | ⏳ |
| M7 | 로컬 시청기록 기반 추천 엔진 | ⏳ |
| M8 | 챗 히스토리 UI + 폴리싱 | ⏳ |

---

## 📖 문서

- **[요구명세서](./docs/requirements.md)** — 기능/비기능 요구사항, 제약, 사용 시나리오, 인수 기준
- **[서비스 구조도](./docs/architecture.md)** — C4 다이어그램, 시퀀스, ERD, ADR
- **web Swagger UI** (실행 후): http://localhost:3000/docs
- **ai-service Swagger UI** (실행 후, 자동 생성): http://localhost:8000/docs

---

## 🛠️ 트러블슈팅

### Next.js 16 dev 서버 OOM
```
FATAL ERROR: Committing semi space failed. Allocation failed - JavaScript heap out of memory
```
**해결**: `NODE_OPTIONS="--max-old-space-size=4096" npm run dev`

### 포트 3000 이미 사용 중 / "Another next dev server is already running"
이전 프로세스가 깔끔히 종료되지 않은 경우:
```bash
# Windows (Git Bash)
taskkill //PID <PID> //F
# 또는 3000 포트를 잡고 있는 프로세스 찾기
netstat -ano | findstr :3000
```

### uv가 PATH에 안 잡힘
`pip install uv` 후 Scripts 디렉토리가 PATH에 없는 경우. 또는:
```powershell
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### yt-dlp 다운로드 실패
YouTube 업데이트로 인한 일시 이슈일 가능성. 최신 버전으로 업데이트:
```bash
cd apps/ai-service
uv lock --upgrade-package yt-dlp
uv sync
```

---

## ⚖️ 법적 고지

- 본 도구는 **개인 사용 localhost MVP**. 배포·상업화·다중 사용자 운영을 하지 않음.
- 다운로드한 클립은 **세션 내 AI 전달용**으로만 사용되고 자동 폐기.
- 스포츠 외 콘텐츠에 대한 분석은 Policy Gate와 시스템 프롬프트 레벨에서 거부.
- YouTube Terms of Service는 제3자 도구의 영상 다운로드를 제한함. 본 프로젝트는 이를 인지하고 있으며, 스코프를 엄격히 개인 로컬 사용으로 한정함.

---

## 📝 라이선스

MIT — 개인 포트폴리오용.
