import { openApiSpec } from "@/lib/openapi";

export const dynamic = "force-static";

export function GET() {
  return Response.json(openApiSpec, {
    headers: { "Cache-Control": "public, max-age=60" },
  });
}
