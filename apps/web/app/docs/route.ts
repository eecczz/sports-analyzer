export const dynamic = "force-static";

const html = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <title>ClipAnalyst API — Swagger UI</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css"
    />
    <style>
      body { margin: 0; background: #fafafa; }
      .topbar { display: none; }
      header.project {
        padding: 12px 20px;
        border-bottom: 1px solid #e5e5e5;
        background: #fff;
        font-family: system-ui, sans-serif;
      }
      header.project a { color: #d64000; text-decoration: none; font-weight: 600; }
      header.project span { color: #666; font-size: 13px; margin-left: 12px; }
    </style>
  </head>
  <body>
    <header class="project">
      <a href="/">← ClipAnalyst 홈</a>
      <span>OpenAPI 3.1 · localhost 개발용</span>
    </header>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-standalone-preset.js"></script>
    <script>
      window.addEventListener("load", () => {
        window.ui = SwaggerUIBundle({
          url: "/api/openapi.json",
          dom_id: "#swagger-ui",
          deepLinking: true,
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset,
          ],
          layout: "StandaloneLayout",
          tryItOutEnabled: true,
        });
      });
    </script>
  </body>
</html>`;

export function GET() {
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
