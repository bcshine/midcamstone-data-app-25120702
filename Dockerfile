# =====================================================
# Next.js + Python FastAPI 통합 Dockerfile
# 하나의 컨테이너에서 두 서비스 실행
# =====================================================

# 1단계: Node.js 의존성 설치
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# 2단계: Next.js 빌드
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

# 3단계: 프로덕션 실행 (Node.js + Python)
FROM node:20-slim AS runner
WORKDIR /app

# 런타임 환경 변수 (Railway에서 전달)
ARG OPENAI_API_KEY
ENV OPENAI_API_KEY=$OPENAI_API_KEY

ENV NODE_ENV=production
ENV DEBIAN_FRONTEND=noninteractive

# Python 및 필수 패키지 설치
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Python 가상환경 생성 및 의존성 설치
COPY scripts/api/requirements.txt /app/python-api/requirements.txt
RUN python3 -m venv /app/venv && \
    /app/venv/bin/pip install --no-cache-dir -r /app/python-api/requirements.txt

# Python API 코드 복사
COPY scripts/api/*.py /app/python-api/

# Next.js standalone 출력물 복사
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 시작 스크립트 생성 (sh 사용, 로깅 추가)
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Starting Python API server..."' >> /app/start.sh && \
    echo 'cd /app/python-api && /app/venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 &' >> /app/start.sh && \
    echo 'sleep 5' >> /app/start.sh && \
    echo 'echo "Python API started. Starting Next.js..."' >> /app/start.sh && \
    echo 'cd /app && PORT=3000 node server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# 환경 변수 설정
ENV PYTHON_API_URL=http://localhost:8000
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

EXPOSE 3000

CMD ["/app/start.sh"]
