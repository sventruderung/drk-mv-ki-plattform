# Build-Kontext: Repo-Root
FROM python:3.12-slim
WORKDIR /app
COPY services/connector-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY services/connector-service/src ./src
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8004"]
