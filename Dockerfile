# =====================================================
# Next.js 프로덕션 Dockerfile
# 멀티스테이지 빌드로 최적화된 이미지 생성
# =====================================================

# 1단계: 의존성 설치
FROM node:20-alpine AS deps
WORKDIR /app

# 패키지 파일 복사
COPY package.json package-lock.json ./

# 의존성 설치
RUN npm ci --legacy-peer-deps

# 2단계: 빌드
FROM node:20-alpine AS builder
WORKDIR /app

# 빌드 시 필요한 환경 변수 (ARG로 전달)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=$NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

# 의존성 복사
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js 빌드
RUN npm run build

# 3단계: 프로덕션 실행
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# 보안을 위한 non-root 사용자
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# standalone 출력물 복사
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

