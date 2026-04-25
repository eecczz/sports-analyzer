export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "ClipAnalyst API",
    version: "0.1.0",
    description:
      "YouTube 스포츠 영상 구간을 AI에게 질의하는 분석 도구. 개인용 localhost MVP.\n\n" +
      "- M1 ✅ : /api/feed, /api/search\n" +
      "- M2–M4 (planned): /api/watch/{videoId}/meta, /api/analyze\n" +
      "- M7–M8 (planned): /api/history, 시청 이벤트 기록",
    contact: { name: "ClipAnalyst" },
  },
  servers: [{ url: "http://localhost:3000", description: "로컬 개발" }],
  tags: [
    { name: "feed", description: "영상 탐색 — 트렌딩/검색" },
    { name: "watch", description: "시청 페이지 메타데이터" },
    { name: "analyze", description: "클립 + 질문 → AI 응답 스트리밍" },
    { name: "history", description: "시청/질문 이력" },
  ],
  components: {
    schemas: {
      VideoSummary: {
        type: "object",
        required: [
          "id",
          "title",
          "channelId",
          "channelTitle",
          "thumbnail",
          "publishedAt",
          "viewCount",
          "durationSec",
        ],
        properties: {
          id: { type: "string", example: "dQw4w9WgXcQ" },
          title: { type: "string" },
          channelId: { type: "string" },
          channelTitle: { type: "string" },
          thumbnail: { type: "string", format: "uri" },
          publishedAt: { type: "string", format: "date-time" },
          viewCount: { type: "integer", minimum: 0 },
          durationSec: { type: "integer", minimum: 0 },
        },
      },
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: { type: "string", example: "YT_API_KEY is not set" },
          code: { type: "string", example: "MISSING_ENV" },
        },
      },
      AnalyzeRequest: {
        type: "object",
        required: ["videoId", "startSec", "endSec", "question"],
        properties: {
          videoId: { type: "string" },
          startSec: { type: "number", minimum: 0 },
          endSec: { type: "number", minimum: 0 },
          question: { type: "string", maxLength: 500 },
        },
        example: {
          videoId: "abcDEF12345",
          startSec: 83.5,
          endSec: 89.0,
          question: "왜 점프 직전에 오른팔을 뒤로 크게 젖히나요?",
        },
      },
      ChatTurn: {
        type: "object",
        properties: {
          id: { type: "integer" },
          clipId: { type: "integer" },
          question: { type: "string" },
          answer: { type: "string" },
          provider: { type: "string", enum: ["gemini", "kimi"] },
          modelName: { type: "string" },
          tokensIn: { type: "integer" },
          tokensOut: { type: "integer" },
          latencyMs: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
    responses: {
      MissingKey: {
        description: "API 키가 설정되지 않음",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
    },
  },
  paths: {
    "/api/feed": {
      get: {
        tags: ["feed"],
        summary: "스포츠 트렌딩 피드",
        description:
          "한국 리전(Sports 카테고리=17) 인기 영상 목록을 반환한다. `YT_REGION` 환경변수로 지역 변경 가능.",
        parameters: [
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", default: 24, minimum: 1, maximum: 50 },
            required: false,
          },
        ],
        responses: {
          "200": {
            description: "영상 요약 배열",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/VideoSummary" },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/MissingKey" },
        },
      },
    },
    "/api/search": {
      get: {
        tags: ["feed"],
        summary: "스포츠 영상 검색",
        parameters: [
          {
            in: "query",
            name: "q",
            required: true,
            schema: { type: "string", minLength: 1 },
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", default: 24, minimum: 1, maximum: 50 },
            required: false,
          },
        ],
        responses: {
          "200": {
            description: "검색 결과",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/VideoSummary" },
                },
              },
            },
          },
          "400": {
            description: "q 누락",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "500": { $ref: "#/components/responses/MissingKey" },
        },
      },
    },
    "/api/watch/{videoId}/meta": {
      get: {
        tags: ["watch"],
        summary: "영상 단일 메타데이터 (planned M2)",
        parameters: [
          {
            in: "path",
            name: "videoId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "영상 메타",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VideoSummary" },
              },
            },
          },
          "404": {
            description: "영상 없음",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/analyze": {
      post: {
        tags: ["analyze"],
        summary: "클립 + 질문 분석 (planned M4–M5)",
        description:
          "요청 받은 구간을 yt-dlp로 추출, ffmpeg 정규화, AI Provider 업로드 후 응답을 SSE 스트림으로 반환한다.\n\n" +
          "**응답 컨텐트 타입**: `text/event-stream`\n\n" +
          "**이벤트 종류**:\n" +
          "- `stage`: 처리 단계 (extract | upload | analyze | done)\n" +
          "- `token`: AI 응답 토큰 1개\n" +
          "- `error`: 실패 (Policy 거절 포함)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AnalyzeRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "SSE 스트림",
            content: {
              "text/event-stream": {
                schema: { type: "string" },
                examples: {
                  streamSample: {
                    value:
                      "event: stage\ndata: {\"stage\":\"extract\"}\n\nevent: token\ndata: {\"text\":\"점프 \"}\n\nevent: token\ndata: {\"text\":\"직전 \"}\n\nevent: stage\ndata: {\"stage\":\"done\"}\n\n",
                  },
                },
              },
            },
          },
          "400": {
            description: "요청 스키마 위반 또는 Policy Gate 거절",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "500": { $ref: "#/components/responses/MissingKey" },
        },
      },
    },
    "/api/history": {
      get: {
        tags: ["history"],
        summary: "질문 이력 조회 (planned M8)",
        parameters: [
          {
            in: "query",
            name: "videoId",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "챗 턴 배열",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/ChatTurn" },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
