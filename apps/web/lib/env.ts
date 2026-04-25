import { z } from "zod";

const schema = z.object({
  YT_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  MOONSHOT_API_KEY: z.string().min(1).optional(),
  AI_PROVIDER: z.enum(["gemini", "kimi"]).default("gemini"),
  YT_REGION: z.string().default("KR"),
});

export const env = schema.parse({
  YT_API_KEY: process.env.YT_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  MOONSHOT_API_KEY: process.env.MOONSHOT_API_KEY,
  AI_PROVIDER: process.env.AI_PROVIDER,
  YT_REGION: process.env.YT_REGION,
});

export function requireYtKey(): string {
  if (!env.YT_API_KEY) {
    throw new Error(
      "YT_API_KEY is not set. Get one at https://console.cloud.google.com/apis/credentials (enable 'YouTube Data API v3'), then put it in .env.local as YT_API_KEY=..."
    );
  }
  return env.YT_API_KEY;
}
