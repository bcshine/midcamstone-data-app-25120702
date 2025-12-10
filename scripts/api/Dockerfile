# =====================================================
# Python FastAPI 회귀분석 서버 Dockerfile
# =====================================================

FROM python:3.11-slim

WORKDIR /app

# 시스템 의존성 설치 (scipy, numpy 빌드에 필요)
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY . .

# 환경 변수
ENV PYTHONUNBUFFERED=1

# Railway에서 PORT 환경 변수를 자동 설정
ENV PORT=8000

EXPOSE 8000

# uvicorn으로 FastAPI 실행
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]







