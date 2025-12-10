# =====================================================
# 통합 Dockerfile (Python 3.11 기반 + Node.js 20)
# 목적: 빌드 오류 없이 scikit-learn 등 과학 패키지 완벽 지원
# =====================================================

# 1단계: Node.js 의존성 설치 (Node 이미지 사용)
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# 2단계: Next.js 빌드 (Node 이미지 사용)
FROM node:20-slim AS builder
WORKDIR /app
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
ARG OPENAI_API_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=$NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
ENV OPENAI_API_KEY=$OPENAI_API_KEY

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3단계: Python 환경 준비 (Python 이미지 사용)
FROM python:3.11-slim AS python-builder
WORKDIR /app
# 필수 빌드 도구 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY scripts/api/requirements.txt ./
# 가상환경 생성 및 패키지 설치
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# 4단계: 최종 실행 이미지 (Python 3.11 베이스)
FROM python:3.11-slim AS runner
WORKDIR /app

# 런타임 환경 변수
ENV NODE_ENV=production
ENV PYTHON_API_URL=http://localhost:8000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Node.js 20 설치 (Python 이미지 위에 설치)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# 빌드된 Python 가상환경 복사
COPY --from=python-builder /opt/venv /opt/venv

# Python API 코드 복사
COPY scripts/api/*.py /app/python-api/

# Next.js 빌드 결과물 복사
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 실행 스크립트 작성
# 1. Python 서버를 백그라운드에서 실행
# 2. Next.js 서버 실행
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "🚀 Starting Python API server..."' >> /app/start.sh && \
    echo 'cd /app/python-api && /opt/venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 > /app/python.log 2>&1 &' >> /app/start.sh && \
    echo 'echo "⏳ Waiting for Python API to Initialize..."' >> /app/start.sh && \
    echo 'sleep 5' >> /app/start.sh && \
    echo 'echo "🚀 Starting Next.js server..."' >> /app/start.sh && \
    echo 'cd /app && node server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

EXPOSE 3000

CMD ["/app/start.sh"]
