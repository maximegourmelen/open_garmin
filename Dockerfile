FROM node:24-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM python:3.13-slim
WORKDIR /app
COPY pyproject.toml ./
COPY server ./server
RUN pip install --no-cache-dir . && useradd --uid 10001 --create-home app && mkdir /data && chown app:app /data
COPY --from=frontend /app/dist ./dist
COPY --from=frontend /app/public ./public
ENV OPEN_GARMIN_DATA_DIR=/data
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health')"
CMD ["uvicorn", "server.app:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
