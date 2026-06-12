# Build-Kontext: Repo-Root (drk-shared muss mit ins Image)
FROM python:3.12-slim
WORKDIR /app
# antiword: Alt-Word (.doc) | catdoc: catppt für Alt-PowerPoint (.ppt)
# tesseract + deu: OCR für gescannte PDFs und Bilddateien
RUN apt-get update && apt-get install -y --no-install-recommends \
        antiword catdoc tesseract-ocr tesseract-ocr-deu \
    && rm -rf /var/lib/apt/lists/*
COPY packages/shared /packages/shared
RUN pip install --no-cache-dir /packages/shared
COPY services/rag-service/pyproject.toml .
COPY services/rag-service/src ./src
RUN pip install --no-cache-dir .
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]
