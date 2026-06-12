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
# Reranker-Modell beim Build buendeln — zur Laufzeit kein Internet noetig
ENV HF_HOME=/opt/hf
RUN python -c "from sentence_transformers import CrossEncoder; \
CrossEncoder('cross-encoder/mmarco-mMiniLMv2-L12-H384-v1', max_length=512)"
ENV HF_HUB_OFFLINE=1
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]
