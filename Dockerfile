# =====================================================
# Next.js + Python FastAPI 통합 Dockerfile
# 하나의 컨테이너에서 두 서비스 실행
# =====================================================

# 1단계: Node.js 의존성 설치
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# 2단계: Next.js 빌드
FROM node:20-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=$NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3단계: 프로덕션 실행 (Node.js + Python)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Python 설치
RUN apk add --no-cache python3 py3-pip

# Python 의존성 설치
COPY scripts/api/requirements.txt /app/python-api/requirements.txt
RUN pip3 install --no-cache-dir --break-system-packages -r /app/python-api/requirements.txt

# Python API 코드 복사
COPY scripts/api/*.py /app/python-api/

# Next.js standalone 출력물 복사
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 시작 스크립트 생성
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'cd /app/python-api && python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 &' >> /app/start.sh && \
    echo 'sleep 2' >> /app/start.sh && \
    echo 'cd /app && PORT=3000 node server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# Python API URL 설정 (localhost로 내부 통신)
ENV PYTHON_API_URL=http://localhost:8000
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

EXPOSE 3000 8000

CMD ["/app/start.sh"]
