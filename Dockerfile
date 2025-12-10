# =====================================================
# Next.js Dockerfile (멀티 스테이지 빌드)
# 개발 및 프로덕션 환경 지원
# =====================================================

# 1단계: 의존성 설치
FROM node:20-slim AS deps
WORKDIR /app

# package.json과 lock 파일 복사
COPY package.json package-lock.json ./

# 의존성 설치
RUN npm ci --legacy-peer-deps

# =====================================================
# 2단계: 개발 환경 (Hot reload 지원)
# =====================================================
FROM node:20-slim AS development
WORKDIR /app

# 의존성 복사
COPY --from=deps /app/node_modules ./node_modules

# 소스 코드는 볼륨 마운트로 제공됨
# docker-compose.yml에서 마운트 설정

EXPOSE 3000

CMD ["npm", "run", "dev"]

# =====================================================
# 3단계: Next.js 빌드
# =====================================================
FROM node:20-slim AS builder
WORKDIR /app

# 빌드 시 필요한 환경 변수 (ARG)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

# 환경 변수 설정
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=$NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

# 의존성 복사
COPY --from=deps /app/node_modules ./node_modules

# 소스 코드 복사 (Python API 제외)
COPY . .

# Next.js 빌드 (standalone 출력)
RUN npm run build

# =====================================================
# 4단계: 프로덕션 실행 환경 (Python + Node.js)
# =====================================================
FROM python:3.11-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1

# Node.js 설치
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Python 패키지 먼저 설치 (builder에서 복사)
COPY --from=builder /app/scripts/api/requirements.txt /app/scripts/api/
RUN pip install --no-cache-dir -r /app/scripts/api/requirements.txt

# 빌드된 파일 복사
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Python API 파일 복사 (builder에서)
COPY --from=builder /app/scripts/api /app/scripts/api

# 시작 스크립트 복사 (builder에서)
COPY --from=builder /app/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# 환경 변수 설정
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
ENV PYTHON_API_URL="http://localhost:8000"

EXPOSE 3000 8000

# 서버 시작 (Python API + Next.js)
CMD ["/app/start.sh"]
