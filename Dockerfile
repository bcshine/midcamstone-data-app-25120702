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
# 4단계: 프로덕션 실행 환경
# =====================================================
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# 보안: non-root 사용자 생성
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 빌드된 파일 복사
COPY --from=builder /app/public ./public

# standalone 출력물 복사
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 사용자 전환
USER nextjs

# 환경 변수 설정
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

EXPOSE 3000

# Next.js 서버 시작
CMD ["node", "server.js"]
