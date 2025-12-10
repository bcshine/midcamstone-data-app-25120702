# =====================================================
# Python FastAPI 전용 Dockerfile
# 별도 Railway 서비스로 배포
# =====================================================

FROM python:3.11-slim

WORKDIR /app

# 빌드 도구 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 의존성 설치
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 코드 복사
COPY *.py ./

ENV PORT=8000

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
