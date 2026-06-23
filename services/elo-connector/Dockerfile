# Build-Kontext: Repo-Root
FROM python:3.12-slim
WORKDIR /app
COPY services/elo-connector/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY services/elo-connector/src ./src
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8005"]
