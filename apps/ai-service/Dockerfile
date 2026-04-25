FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/root/.local/bin:/app/.venv/bin:${PATH}"

RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install uv via the official standalone installer
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

WORKDIR /app

# Leverage layer caching: deps first
COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-dev || uv sync --no-dev

COPY app ./app

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
