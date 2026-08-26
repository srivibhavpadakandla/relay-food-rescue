# Relay ships as one Cloud Run service: the operations UI and the ADK agent
# that powers it share an origin, a deployment and a revision.

# --- stage 1: build the operations UI ---------------------------------------
FROM node:22-slim AS ui
WORKDIR /ui
COPY ui/package.json ui/package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
COPY ui/ ./
RUN npm run build

# --- stage 2: the agent service ---------------------------------------------
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    RELAY_UI_DIR=/app/ui

WORKDIR /app

COPY services/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/relay_agent ./relay_agent
COPY --from=ui /services/ui ./ui

EXPOSE 8080
CMD ["sh", "-c", "exec uvicorn relay_agent.server:app --host 0.0.0.0 --port ${PORT}"]
