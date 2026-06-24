# Build-Kontext: Repo-Root (drk-shared muss mit ins Image)
FROM python:3.12-slim
WORKDIR /app
COPY packages/shared /packages/shared
RUN pip install --no-cache-dir /packages/shared
COPY services/api-gateway/pyproject.toml .
COPY services/api-gateway/src ./src
RUN pip install --no-cache-dir .
# Entwicklungsstand fürs Admin-UI: wird beim Image-Build gesetzt
RUN date -u +%Y-%m-%d > /app/build_date
# Verwendete Git-Branch fürs Admin-UI (Build-Kontext = Repo-Root, enthält .git)
COPY .git/HEAD /app/git_head
RUN if grep -q '^ref:' /app/git_head 2>/dev/null; then \
        sed 's#^ref: refs/heads/##' /app/git_head | tr -d '\n' > /app/build_branch; \
    else echo dev > /app/build_branch; fi && rm -f /app/git_head
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
