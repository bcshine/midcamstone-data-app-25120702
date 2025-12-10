# Docker 사용 가이드

MIDCAM 온톨로지 데이터 분석 앱의 Docker 환경 구축 및 사용 방법을 설명합니다.

## 목차

- [아키텍처](#아키텍처)
- [로컬 개발](#로컬-개발)
- [프로덕션 빌드](#프로덕션-빌드)
- [트러블슈팅](#트러블슈팅)
- [자주 묻는 질문](#자주-묻는-질문).......

## 아키텍처

### 멀티 컨테이너 구조

이 프로젝트는 두 개의 독립적인 컨테이너로 구성됩니다:

```
┌─────────────────────────────────────────┐
│         Docker Network                   │
│  ┌──────────────┐    ┌──────────────┐  │
│  │   Next.js    │───▶│  Python API  │  │
│  │  Port 3000   │    │  Port 8000   │  │
│  │              │    │              │  │
│  │  - UI/UX     │    │  - 회귀분석  │  │
│  │  - Routing   │    │  - 통계분석  │  │
│  └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────┘
```

**장점:**
- 각 서비스 독립 개발 및 배포
- 분석 로직 변경 시 Python만 재시작
- 수평 확장 가능 (각 서비스 독립 스케일링)
- Railway 멀티 서비스 배포에 최적화

## 로컬 개발

### 사전 요구사항

- Docker Desktop 설치 (Windows/Mac) 또는 Docker Engine (Linux)
- Docker Compose 설치 (Docker Desktop에 포함)

### 환경 변수 설정

1. `.env.example`을 복사하여 `.env.local` 생성:
   ```bash
   cp .env.example .env.local
   ```

2. `.env.local` 파일에 실제 값 입력:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   OPENAI_API_KEY=your-openai-key
   ```

### 개발 서버 실행

#### 기본 실행

```bash
# 전체 환경 실행 (포그라운드)
docker-compose up

# 백그라운드 실행
docker-compose up -d

# 특정 서비스만 실행
docker-compose up nextjs
docker-compose up python-api
```

#### 로그 확인

```bash
# 전체 로그
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f nextjs
docker-compose logs -f python-api

# 최근 100줄만 보기
docker-compose logs --tail=100 -f
```

#### 컨테이너 관리

```bash
# 실행 중인 컨테이너 확인
docker-compose ps

# 컨테이너 재시작
docker-compose restart

# 특정 서비스 재시작
docker-compose restart python-api

# 컨테이너 중지
docker-compose stop

# 컨테이너 중지 및 삭제
docker-compose down

# 볼륨까지 삭제 (주의: 데이터 손실)
docker-compose down -v
```

### Hot Reload

개발 환경에서는 코드 변경 시 자동으로 반영됩니다:

- **Next.js**: 파일 저장 시 자동 리로드
- **Python API**: uvicorn의 `--reload` 옵션으로 자동 재시작

파일 변경 사항이 반영되지 않으면:
```bash
docker-compose restart
```

## 프로덕션 빌드

### 로컬에서 프로덕션 테스트

Railway 배포 전에 로컬에서 프로덕션 빌드를 테스트할 수 있습니다:

```bash
# 프로덕션 빌드 실행
docker-compose -f docker-compose.prod.yml up --build

# 백그라운드 실행
docker-compose -f docker-compose.prod.yml up -d --build

# 종료
docker-compose -f docker-compose.prod.yml down
```

**개발 vs 프로덕션 차이:**

| 항목 | 개발 환경 | 프로덕션 환경 |
|------|----------|--------------|
| 빌드 타입 | dev | standalone |
| Hot Reload | O | X |
| 소스 마운트 | O | X |
| 최적화 | X | O |
| 용량 | 큼 | 작음 |

### 이미지 빌드

개별 서비스 이미지를 빌드할 수 있습니다:

```bash
# Next.js 이미지
docker build -t midcam-nextjs .

# Python API 이미지
docker build -t midcam-python-api ./scripts/api

# 빌드 캐시 없이 강제 재빌드
docker build --no-cache -t midcam-nextjs .
```

### 이미지 실행

```bash
# Next.js 실행
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key \
  -e PYTHON_API_URL=http://python-api:8000 \
  midcam-nextjs

# Python API 실행
docker run -p 8000:8000 \
  -e ALLOWED_ORIGINS=http://localhost:3000 \
  midcam-python-api
```

## Railway 배포

### 배포 워크플로우

```
로컬 개발 (docker-compose)
    ↓
Git Push
    ↓
Railway 자동 빌드 및 배포
    ├─ Next.js 서비스 (루트 Dockerfile)
    └─ Python 서비스 (scripts/api/Dockerfile)
```

### 각 서비스 설정

#### Next.js 서비스

**Railway 설정:**
- Root Directory: `/`
- Builder: `DOCKERFILE`
- Dockerfile Path: `Dockerfile`

**환경 변수:**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=
PYTHON_API_URL=http://python-api.railway.internal:8000
OPENAI_API_KEY=
```

#### Python API 서비스

**Railway 설정:**
- Root Directory: `scripts/api`
- Builder: `DOCKERFILE`
- Dockerfile Path: `Dockerfile`

**환경 변수:**
```
ALLOWED_ORIGINS=https://your-nextjs-service.railway.app
PORT=8000
```

### 독립 배포의 장점

각 서비스를 독립적으로 업데이트할 수 있습니다:

```bash
# Python 분석 로직만 수정
git commit -m "Update regression analysis"
git push
# → Python 서비스만 재배포 (빠름)

# Next.js UI만 수정
git commit -m "Update dashboard UI"
git push
# → Next.js 서비스만 재배포 (빠름)
```

## 트러블슈팅

### 포트 충돌

**증상:** `port is already allocated` 오류

**해결:**
```bash
# 포트 사용 중인 프로세스 확인 (Windows)
netstat -ano | findstr :3000
netstat -ano | findstr :8000

# 프로세스 종료 (Windows)
taskkill /PID [프로세스_ID] /F

# 포트 사용 중인 프로세스 확인 (Mac/Linux)
lsof -i :3000
lsof -i :8000

# 프로세스 종료 (Mac/Linux)
kill -9 [프로세스_ID]
```

### 환경 변수 로드 안됨

**증상:** Supabase 연결 오류

**해결:**
```bash
# .env.local 파일 확인
cat .env.local  # Mac/Linux
type .env.local  # Windows

# Docker Compose 재시작
docker-compose down
docker-compose up
```

### 이미지 빌드 실패

**증상:** 빌드 중 오류 발생

**해결:**
```bash
# 빌드 캐시 삭제
docker builder prune

# 모든 캐시 삭제 (주의)
docker system prune -a

# 재빌드
docker-compose build --no-cache
docker-compose up
```

### 컨테이너 실행 안됨

**증상:** 컨테이너가 바로 종료됨

**해결:**
```bash
# 로그 확인
docker-compose logs nextjs
docker-compose logs python-api

# 컨테이너 상태 확인
docker-compose ps

# 강제 재생성
docker-compose up --force-recreate
```

### Python 패키지 설치 오류

**증상:** `ModuleNotFoundError`

**해결:**
```bash
# Python 컨테이너 재빌드
docker-compose build python-api

# 컨테이너 내부에서 확인
docker-compose exec python-api pip list
```

### Next.js 빌드 오류

**증상:** 빌드 단계에서 실패

**해결:**
```bash
# Node.js 캐시 삭제 후 재빌드
docker-compose build --no-cache nextjs

# 로컬에서 테스트
npm run build
```

## 자주 묻는 질문

### Q1: 개발 시 Docker를 써야 하나요?

**A:** 선택사항입니다. 하지만 Docker 사용을 권장합니다:
- ✅ 환경 일관성 보장
- ✅ 한 줄로 전체 환경 실행
- ✅ Railway 배포와 동일한 환경
- ❌ Docker 학습 곡선
- ❌ 약간의 성능 오버헤드

### Q2: Hot Reload가 작동하지 않아요

**A:** 다음을 확인하세요:
1. `docker-compose.yml` 사용 (dev 환경)
2. 볼륨 마운트 확인: `-v .:/app`
3. 컨테이너 재시작: `docker-compose restart`

### Q3: 프로덕션 빌드는 어떻게 테스트하나요?

**A:**
```bash
docker-compose -f docker-compose.prod.yml up --build
```

### Q4: Railway 배포 시 빌드가 느려요

**A:** 각 서비스를 독립적으로 배포하면:
- Python만 수정 시 Python 서비스만 빌드
- Next.js만 수정 시 Next.js 서비스만 빌드
- 불필요한 빌드 시간 단축

### Q5: 로컬 DB는 어떻게 사용하나요?

**A:** 이 프로젝트는 Supabase를 사용합니다. 로컬 DB가 필요하면:
1. Supabase CLI로 로컬 인스턴스 실행
2. 또는 `docker-compose.yml`에 PostgreSQL 추가

### Q6: Python 패키지를 추가했는데 반영이 안돼요

**A:**
```bash
# requirements.txt 수정 후
docker-compose build python-api
docker-compose up -d
```

### Q7: 컨테이너 간 통신이 안돼요

**A:**
- `docker-compose.yml`의 서비스 이름 사용
- Next.js → Python: `http://python-api:8000`
- 같은 네트워크(`midcam-network`)에 있는지 확인

---

## 추가 자료

- [Docker 공식 문서](https://docs.docker.com/)
- [Docker Compose 문서](https://docs.docker.com/compose/)
- [Next.js Docker 가이드](https://nextjs.org/docs/deployment#docker-image)
- [Railway 문서](https://docs.railway.app/)

