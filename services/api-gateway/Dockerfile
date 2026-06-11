# Build-Kontext: Repo-Root (drk-shared muss mit ins Image)
FROM python:3.12-slim
WORKDIR /app
COPY packages/shared /packages/shared
RUN pip install --no-cache-dir /packages/shared
COPY services/api-gateway/pyproject.toml .
COPY services/api-gateway/src ./src
RUN pip install --no-cache-dir .
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
