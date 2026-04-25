# 요구명세서 (Requirements Specification)

**프로젝트**: ClipAnalyst — Sports Pose Analysis Companion
**버전**: 0.1 (MVP 설계)
**작성일**: 2026-04-24
**스코프**: 개인용 / localhost MVP (단일 사용자, 무인증)

---

## 1. 개요

YouTube의 스포츠 영상을 시청하면서 특정 **구간을 즉석에서 클립**하고, 해당 클립에 대한 질문을 **영상 이해 AI**(Gemini 3.1 Pro / Kimi K2.6)에게 보내 **자세·동작의 의도**를 설명받는 단일 페이지 도구.

### 1.1 문제 정의

기존 워크플로우(YouTube 시청 → mp4 추출 사이트 → 별도 트리머 → AI 챗봇 업로드 → 타임스탬프 서술 → 질문)는 4개 이상의 앱을 경유하며 매 스텝마다 정보가 소실된다. 본 시스템은 이 체인을 **한 페이지**로 압축한다.

### 1.2 비전 (Out of scope 명시)

- **한다**: YouTube 공개 영상 → 서버사이드 구간 클립 → AI 분석 → 스트리밍 응답
- **안 한다**: 다중 사용자, 결제, 모바일 앱, 스포츠 외 도메인, 자체 포즈 추정 모델, 영상 업로드/호스팅, YouTube 계정 연동

---

## 2. 용어 정의

| 용어 | 정의 |
|---|---|
| 클립(Clip) | 원본 YouTube 영상의 `[startSec, endSec]` 구간 |
| 분석(Analyze) | 클립 + 사용자 질문을 AI 공급자에게 전송해 자연어 응답을 받는 1 회 처리 단위 |
| AI Provider | 영상 이해가 가능한 LLM 공급자 (Gemini 또는 Kimi). `lib/ai/provider.ts` 인터페이스로 추상화 |
| Policy Gate | 사용자 입력이 본 서비스 스코프(스포츠) 및 안전 정책에 부합하는지 검사하는 pre-filter |
| Quality Gate | AI 응답이 질문과 관련성 있고 환각이 아닌지 post-check |
| 피드(Feed) | 홈 화면에 노출되는 영상 목록. 초기엔 트렌딩, 이후 로컬 시청기록 기반 개인화 |

---

## 3. 기능 요구사항 (Functional Requirements)

각 요구사항에는 ID, 우선순위(P0=필수/P1=중요/P2=선택), 소속 마일스톤, 인수 기준을 명시한다.

### 3.1 프론트엔드 — 탐색 (FR-FE-NAV)

| ID | 제목 | 우선순위 | 마일스톤 | 인수 기준 |
|---|---|---|---|---|
| FR-FE-NAV-01 | 홈에 스포츠 트렌딩 표시 | P0 | M1 ✅ | 홈 진입 시 한국(KR) 리전 Sports 카테고리(17) 인기 영상 24편이 4열 그리드로 렌더 |
| FR-FE-NAV-02 | 검색창으로 영상 찾기 | P0 | M1 ✅ | 상단 검색창에 키워드 입력 후 엔터 시 `/search?q=...` 라우팅, 결과 24편 그리드 렌더 |
| FR-FE-NAV-03 | 영상 카드에 메타 노출 | P0 | M1 ✅ | 썸네일, 제목(2줄 말줄임), 채널명, 조회수(만/억회 단위), 재생시간, 상대시간(~개월 전) |
| FR-FE-NAV-04 | 스포츠 외 카테고리 soft-block | P1 | M7 | 검색·추천 결과는 Sports 카테고리로 필터링. 외부에서 non-sports URL 직접 진입 시 경고 배너 |
| FR-FE-NAV-05 | 개인화 피드 (For You) | P1 | M7 | 시청기록 ≥3건 축적 후 홈 최상단에 키워드/채널 기반 추천 레일 노출 |
| FR-FE-NAV-06 | Because you asked… 레일 | P2 | M8 | 질문을 남긴 영상들의 공통 키워드로 관련 영상 추천 |

### 3.2 프론트엔드 — 시청 및 클립 (FR-FE-WATCH)

| ID | 제목 | 우선순위 | 마일스톤 | 인수 기준 |
|---|---|---|---|---|
| FR-FE-WATCH-01 | 시청 페이지 진입 | P0 | M2 | `/watch/[videoId]`에서 YouTube IFrame Player API로 영상 재생, 제목·채널·조회수 표시 |
| FR-FE-WATCH-02 | 클립 구간 선택기 | P0 | M3 | 재생바 위에 듀얼-썸 슬라이더. 드래그 시 `seekTo()`로 플레이어 스크럽, 현재 선택 `[start, end]` 숫자 표시 (분:초) |
| FR-FE-WATCH-03 | 기본값 15초 클립 | P0 | M3 | 페이지 진입 시 `[0, min(duration, 15)]`로 초기화 |
| FR-FE-WATCH-04 | 클립 최소/최대 길이 검증 | P1 | M3 | 최소 1초, 최대 60초. 경계 밖 시 드래그 자동 snap |
| FR-FE-WATCH-05 | 질문 입력과 전송 | P0 | M5 | 오른쪽 패널에 텍스트 입력창, 전송 버튼. 비어있으면 disabled |
| FR-FE-WATCH-06 | 단계별 진행 UI | P1 | M5 | `영상 추출 → 업로드 → 분석 중 → 답변 스트리밍` 4단계 상태 표시 |
| FR-FE-WATCH-07 | 답변 스트리밍 렌더 | P0 | M5 | SSE 수신 토큰을 실시간으로 타자 효과처럼 표시 |
| FR-FE-WATCH-08 | 질문 히스토리 | P1 | M8 | 같은 영상에 대해 과거 질문·응답 목록을 사이드바로 열람 |

### 3.3 백엔드 API (FR-BE-API)

| ID | 엔드포인트 | 메서드 | 우선순위 | 마일스톤 | 인수 기준 |
|---|---|---|---|---|---|
| FR-BE-API-01 | `/api/feed` | GET | P1 | M1 ✅ | Sports 트렌딩 24편을 JSON으로 반환 (서버 컴포넌트는 `lib/youtube.ts` 직접 호출) |
| FR-BE-API-02 | `/api/search?q=` | GET | P1 | M1 ✅ | 검색어로 Sports 카테고리 내 영상 24편 반환 |
| FR-BE-API-03 | `/api/watch/[videoId]/meta` | GET | P0 | M2 | 단일 영상 메타데이터 반환 (제목/채널/재생시간/태그) |
| FR-BE-API-04 | `/api/analyze` | POST | P0 | M4-M5 | `{videoId, startSec, endSec, question}` 수신 → SSE 스트림 (`stage` + `token` 이벤트) |
| FR-BE-API-05 | `/api/history` | GET/POST | P1 | M8 | 시청 이벤트, 질문-응답 턴 조회·저장 |

### 3.4 영상 처리 파이프라인 (FR-CLIP)

| ID | 제목 | 우선순위 | 마일스톤 | 인수 기준 |
|---|---|---|---|---|
| FR-CLIP-01 | 구간 추출 (yt-dlp) | P0 | M4 | `yt-dlp --download-sections "*startSec-endSec"`로 필요 구간만 다운로드 (전체 영상 ≠ 다운로드) |
| FR-CLIP-02 | 포맷 정규화 (ffmpeg) | P0 | M4 | H.264/AAC mp4로 재인코딩. `-movflags +faststart`로 streaming-ready |
| FR-CLIP-03 | 임시파일 수명관리 | P1 | M4 | OS temp 디렉토리 사용, 세션 종료 시 일괄 purge. 경로는 DB에 저장하지 않음 |
| FR-CLIP-04 | 실패 복구 | P1 | M4 | yt-dlp 실패 시 재시도 1회 후 사람이 읽을 수 있는 오류 메시지 반환 (ex: "yt-dlp 최신 버전으로 업데이트하세요") |
| FR-CLIP-05 | 타임 패딩 안전장치 | P2 | M4 | 시작/끝에 ±0.25초 패딩 적용 (IFrame Player와 yt-dlp 타이밍 드리프트 방지) |

### 3.5 AI 서비스 계층 (FR-AI)

| ID | 제목 | 우선순위 | 마일스톤 | 인수 기준 |
|---|---|---|---|---|
| FR-AI-01 | Provider 추상화 인터페이스 | P0 | M5 | `interface AIProvider { uploadVideo(path): Promise<FileRef>; ask(fileRef, prompt): AsyncIterable<string> }` 선언 |
| FR-AI-02 | Gemini Provider 구현 | P0 | M5 | Gemini 3.1 Pro Files API로 mp4 업로드 → `generateContent` 스트리밍 |
| FR-AI-03 | Kimi Provider 구현 (swap) | P1 | M6 | Moonshot OpenAI-compatible endpoint로 동일 인터페이스 구현. `.env`의 `AI_PROVIDER` 한 줄로 전환 |
| FR-AI-04 | Policy Gate (입력 검사) | P1 | M5 | 사용자 질문이 ①스포츠 맥락 ②비속어·프롬프트 인젝션 없음을 만족하는지 경량 검사. 위반 시 즉시 거부 |
| FR-AI-05 | Quality Gate (출력 검사) | P2 | M5 | AI 응답이 ①질문에 실제로 답하고 ②영상 관련 용어를 포함하는지 heuristic 검사. 실패 시 재시도 1회 |
| FR-AI-06 | 시스템 프롬프트 | P0 | M5 | 스포츠 자세 분석 전용 페르소나. 비-스포츠 질의 시 정중히 거절하도록 지시 |
| FR-AI-07 | 토큰·지연 로깅 | P1 | M5 | 요청당 `tokensIn/tokensOut/latencyMs`를 DB에 기록하여 비용·성능 가시화 |

### 3.6 데이터 영속 (FR-DATA)

| ID | 제목 | 우선순위 | 마일스톤 | 인수 기준 |
|---|---|---|---|---|
| FR-DATA-01 | SQLite + Drizzle 스키마 초기화 | P0 | M4 | 스키마 정의 및 마이그레이션 파일 1회 생성. 로컬 `.data/clip.db` |
| FR-DATA-02 | 시청 이벤트 저장 | P1 | M7 | 영상 재생 시작·중지·종료에 대한 `watchEvents` 행 삽입 |
| FR-DATA-03 | 영상 메타 캐시 | P1 | M7 | `videosCache`에 제목/채널/태그를 최대 24h 캐싱 |
| FR-DATA-04 | 클립·질문 영속 | P0 | M8 | 분석 1회당 `clips` + `chatTurns` 행 각 1건 저장 |

---

## 4. 비기능 요구사항 (Non-Functional Requirements)

| ID | 카테고리 | 요구사항 | 측정 방법 |
|---|---|---|---|
| NFR-PERF-01 | 성능 | 분석 요청 → 첫 토큰까지 p95 ≤ 20초 | 스테이지별 타이밍 로그 |
| NFR-PERF-02 | 성능 | 30초 클립의 yt-dlp 다운로드 p95 ≤ 10초 (개인 네트워크, ≥50Mbps) | `extractClip` 래퍼 타이밍 |
| NFR-PERF-03 | 성능 | 홈 피드 TTFB ≤ 500ms (캐시 적중 시) | Next.js unstable_cache TTL 600s |
| NFR-SEC-01 | 보안 | API 키(YouTube, Gemini, Moonshot)는 `.env.local`에만 보관, git 커밋 금지 | `.gitignore`에 `.env*` 포함 확인 |
| NFR-SEC-02 | 보안 | 서버에서 다운로드한 mp4는 세션 종료 시 purge | 앱 부팅 시 OS temp 내 `clipanalyst-*` 파일 정리 |
| NFR-MAINT-01 | 유지보수 | 타입 안전: `strict: true`, `tsc --noEmit` 통과 | CI 단계 체크 |
| NFR-MAINT-02 | 유지보수 | 코드 품질: ESLint 에러 0건 | `npm run lint` |
| NFR-MAINT-03 | 테스트 | 핵심 util(`lib/format`, `lib/env`) 단위 테스트 커버리지 ≥ 80% | `npm run test -- --coverage` |
| NFR-OBS-01 | 관측성 | 모든 외부 호출(YouTube, AI)의 latency/에러를 stdout 구조화 로그로 기록 | 터미널 로그 검사 |
| NFR-COMPAT-01 | 호환성 | Node.js ≥ 22 LTS 지원 (개발: 24.11) | `package.json` engines 필드 |
| NFR-COMPAT-02 | 호환성 | 개발 환경: Windows 11 + scoop(yt-dlp, ffmpeg), macOS(brew) 양쪽 지원 | 설치 가이드 |

---

## 5. 제약사항 (Constraints)

### 5.1 법적 / 정책적

- **C-LEGAL-01**: YouTube ToS는 제3자 도구의 영상 다운로드를 금지한다. 본 도구는 **개인 사용 localhost MVP**로 스코프가 한정되며, **공개 배포 / 다중 사용자 운영 / 상업화를 하지 않는다**.
- **C-LEGAL-02**: 스포츠 영상 외 도메인(민감·분쟁 가능 콘텐츠)에 대한 분석은 시스템 프롬프트 및 Policy Gate로 거부한다.
- **C-LEGAL-03**: 저작권이 있는 클립을 원본 범위를 넘어 재배포하지 않는다. 추출된 mp4는 세션 내 AI 전달용으로만 사용하고 폐기한다.

### 5.2 기술적

- **C-TECH-01**: yt-dlp가 YouTube 업데이트로 일시 장애 시 서비스 전체가 영향을 받는다. 최신 버전 유지 전략 필요.
- **C-TECH-02**: AI Provider 비디오 모델의 최대 영상 길이·해상도 제한이 있다(Kimi 2K까지, Gemini 1fps 샘플링). 클립 상한을 60초로 제한.
- **C-TECH-03**: Next.js 16 + Turbopack은 특정 조건에서 dev 서버 힙 OOM 발생. `NODE_OPTIONS=--max-old-space-size=4096` 워크어라운드 사용.
- **C-TECH-04**: Windows 환경에서 yt-dlp/ffmpeg PATH 해결은 boot-time에 검증한다 (`lib/bin.ts`).

---

## 6. 대표 사용 시나리오 (Use Cases)

### UC-01: 배구 스파이크 자세 분석

1. 사용자가 홈에서 "김연경 스파이크" 검색
2. 결과 그리드에서 원하는 영상 클릭 → 시청 페이지 진입
3. 재생 중 스파이크 순간(예: 01:23)에서 일시정지
4. 클립 슬라이더로 `[01:21, 01:27]` 범위 지정
5. "왜 점프 직전에 오른팔을 저 각도로 뒤로 젖히는가?" 입력 후 전송
6. 단계별 진행 UI (영상 추출 → 업로드 → 분석) 노출
7. 15초 내 첫 토큰, 스트리밍으로 답변 수신
8. 답변 및 해당 클립 메타가 히스토리에 저장됨

### UC-02: 시청 이력 기반 추천

1. 사용자가 볼리볼 영상 5편 시청·질문
2. 다음날 홈 재진입 시 "For You" 레일이 볼리볼·리시브·서브 관련 최신 영상으로 구성됨
3. 사용자가 "Because you asked about 스파이크 타이밍" 레일의 영상 클릭

### UC-03: 비-스포츠 콘텐츠 거절

1. 사용자가 요리 영상 URL을 직접 입력해 시청 페이지 진입
2. 상단에 "이 영상은 스포츠 카테고리가 아닙니다" 경고 배너 표시
3. 질문 전송 시도 시 Policy Gate가 요청을 즉시 거부하고 사유 표시

---

## 7. 마일스톤별 구현 상태

| 마일스톤 | 내용 | 관련 FR | 상태 |
|---|---|---|---|
| M1 | Skeleton + 트렌딩 피드 + 검색 | NAV-01~03, BE-01~02 | ✅ Done |
| M2 | 시청 페이지 + IFrame Player | WATCH-01, BE-03 | Planned |
| M3 | 클립 구간 선택기 | WATCH-02~04 | Planned |
| M4 | yt-dlp + ffmpeg 추출 + DB 초기화 | CLIP-01~05, DATA-01 | Planned |
| M5 | Gemini Provider + SSE + Policy/Quality Gate | WATCH-05~07, AI-01,02,04,05,06,07, BE-04 | Planned |
| M6 | Kimi Provider swap | AI-03 | Planned |
| M7 | 개인화 피드 + 시청 이력 | NAV-04,05, DATA-02,03, BE-05 | Planned |
| M8 | 히스토리 UI + 폴리싱 | NAV-06, WATCH-08, DATA-04 | Planned |

---

## 8. 변경 이력

| 날짜 | 버전 | 변경 | 근거 |
|---|---|---|---|
| 2026-04-24 | 0.1 | 최초 작성 | M1 완료 시점에 명세 정리 |
