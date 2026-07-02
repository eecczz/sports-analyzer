# SportsAnalyst

## 프로젝트 개요

YouTube 스포츠 영상의 특정 구간을 선택하고, 해당 구간을 AI 모델에 전달해 자세한 동작 분석을 받는 로컬 MVP 프로젝트입니다. Next.js 웹 앱과 FastAPI 기반 AI 서비스가 분리된 구조로 동작합니다.

## 주요 기능

- YouTube 스포츠 영상 검색 및 선택
- 타임라인 기반 클립 구간 선택
- yt-dlp와 ffmpeg를 활용한 서버 사이드 구간 추출
- SSE 기반 AI 분석 결과 스트리밍
- Gemini/Kimi 등 AI Provider 전환 구조
- SQLite 기반 로컬 데이터 저장

## 기술 스택

- Frontend: Next.js, TypeScript
- Backend/AI Service: FastAPI, Python
- Data: SQLite
- AI: Gemini API, Kimi API
- Media: yt-dlp, ffmpeg

## 로컬 실행

```bash
cd apps/ai-service
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

```bash
cd apps/web
cp .env.example .env
npm install
npm run dev
```

## 저장소 관리 기준

- API 키는 `.env`에만 저장하고 Git에 커밋하지 않습니다.
- 영상 처리 결과물, 캐시, 로컬 DB 파일은 Git에서 제외합니다.
