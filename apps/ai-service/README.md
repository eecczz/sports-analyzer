# apps/ai-service — ClipAnalyst AI 파이프라인

FastAPI + Python 3.13. yt-dlp (라이브러리 직접 import), ffmpeg (subprocess), Gemini/Kimi Provider를 담당. SSE로 단계별 진행과 AI 응답 토큰을 스트리밍.

> 루트 README: [../../README.md](../../README.md)
> 아키텍처: [../../docs/architecture.md](../../docs/architecture.md)

## 빠른 시작

```bash
# uv 설치 (1회)
pip install uv

# 의존성 동기화 + 서버 실행
uv sync
cp .env.example .env                 # GEMINI_API_KEY 채우기
uv run uvicorn app.main:app --reload --port 8000
```

→ Swagger UI (자동 생성): http://localhost:8000/docs
→ ReDoc: http://localhost:8000/redoc

## 주요 명령

| 명령 | 용도 |
|---|---|
| `uv sync` | 의존성 설치 (venv 자동) |
| `uv run uvicorn app.main:app --reload` | 개발 서버 |
| `uv run pytest` | 테스트 |
| `uv run pytest -v` | 상세 테스트 출력 |
| `uv run ruff check .` | 린트 |
| `uv run ruff format .` | 포매팅 |
| `uv run mypy app` | 타입 체크 |

## 환경변수 (`.env`)

- `AI_PROVIDER` — `gemini` (default) 또는 `kimi`
- `GEMINI_API_KEY` — [Google AI Studio](https://aistudio.google.com/apikey)
- `MOONSHOT_API_KEY` — [Moonshot](https://platform.moonshot.ai/) (Kimi 사용시)
- `DB_URL` — 기본 `sqlite+aiosqlite:///.data/ai.db`
- `CORS_ORIGINS` — 기본 `["http://localhost:3000"]`

## 엔드포인트

| 메서드 | 경로 | 용도 | 구현 상태 |
|---|---|---|---|
| GET | `/health` | 상태/provider 확인 | ✅ |
| POST | `/analyze` | 클립+질문 → SSE 스트림 | 🟡 stub (M4/M5에서 실구현) |
| GET | `/history` | 챗 히스토리 | ⏳ M8 |
| GET | `/docs` | Swagger UI (자동) | ✅ |

## 프로젝트 구조

```
apps/ai-service/
├── app/
│   ├── main.py              # FastAPI app + CORS + 라우터 등록
│   ├── core/
│   │   └── config.py        # pydantic-settings .env 검증
│   ├── routes/
│   │   ├── health.py
│   │   └── analyze.py       # POST /analyze (SSE)
│   ├── services/            # M4~ 구현 예정
│   │   ├── clip.py          # yt_dlp lib + ffmpeg
│   │   ├── guard.py         # Policy + Quality
│   │   └── ai/              # Provider 추상화 + 구현체
│   ├── db/                  # M4~ SQLAlchemy 모델
│   └── schemas.py           # Pydantic 요청/응답 모델
├── tests/
│   ├── test_health.py
│   └── test_analyze_stub.py
├── pyproject.toml           # uv 관리
├── .env.example
└── Dockerfile
```

## 외부 의존 이유

- **yt-dlp** (Python lib) — CLI 셸아웃 대비: (a) 프로세스 스폰 비용 0, (b) progress 콜백, (c) 구조화된 예외.
- **google-genai** — Gemini 공식 SDK, 영상 파일 업로드/스트리밍 완비.
- **openai** — Moonshot Kimi는 OpenAI-호환 API라 이 SDK를 `base_url`만 바꿔 사용.
- **sse-starlette** — FastAPI용 SSE 래퍼, `EventSourceResponse`로 이벤트 직렬화 자동화.

## 테스트

현 베이스라인 (M1.5 시점):

```
tests/
├── test_health.py           # /health 응답 검증
└── test_analyze_stub.py     # /analyze 스텁: 구간 길이 검증, SSE 응답 파싱
```

M4부터 추가될 테스트:
- `test_clip.py` — yt_dlp + ffmpeg 파이프라인 (통합 테스트, 짧은 공개 영상)
- `test_guard.py` — policy/quality 케이스
- `test_provider.py` — Provider mock 계약 검증
