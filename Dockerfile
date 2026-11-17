# HeLPR: one container serving the API and the web app (e.g. for Hugging Face Spaces, Render, a VM).
# Build: docker build -t helpr .      Run: docker run -p 7860:7860 helpr
FROM node:22-slim AS web
WORKDIR /web
COPY app/frontend/package*.json ./
RUN npm ci
COPY app/frontend/ ./
RUN npm run build

FROM mcr.microsoft.com/playwright/python:v1.65.0-noble
WORKDIR /srv
COPY app/backend/requirements.txt app/backend/requirements.txt
RUN pip install --no-cache-dir -r app/backend/requirements.txt
COPY app/backend app/backend
COPY --from=web /web/dist app/frontend/dist
COPY app/demo app/demo
ENV LPR_RUNTIME_DIR=/data LPR_DEMO_SNAPSHOT=/srv/app/demo PYTHONUNBUFFERED=1
RUN mkdir -p /data && chmod 777 /data
EXPOSE 7860
CMD ["python", "-m", "uvicorn", "lpr.api:app", "--app-dir", "app/backend", "--host", "0.0.0.0", "--port", "7860"]
