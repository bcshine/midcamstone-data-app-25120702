# MIDCAM 온톨로지 데이터 분석 앱

Next.js + Python FastAPI 기반 데이터 분석 웹 애플리케이션입니다.

## 🛠 기술 스택

- **프론트엔드**: Next.js 16, React 19, Tailwind CSS
- **백엔드**: Supabase (데이터베이스), Python FastAPI (회귀분석)
- **분석**: statsmodels, scipy, scikit-learn

## 🚀 로컬 개발

### 1. 의존성 설치

```bash
# Next.js 의존성
npm install

# Python 의존성
cd scripts/api
pip install -r requirements.txt
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하세요:

```env
# Supabase 설정 (필수)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Python 분석 서버 URL
PYTHON_API_URL=http://localhost:8000

# OpenAI API 키 (LLM 해석 기능용, 선택사항)
OPENAI_API_KEY=your-openai-key
```

### 3. 개발 서버 실행

```bash
# 터미널 1: Next.js 서버
npm run dev

# 터미널 2: Python 분석 서버
cd scripts/api
python main.py
```

- Next.js: http://localhost:3000
- Python API: http://localhost:8000
- API 문서: http://localhost:8000/docs

---

## 🚂 Railway 배포

이 프로젝트는 **두 개의 Railway 서비스**로 배포해야 합니다:
1. **Next.js 앱** (메인 웹 서비스)
2. **Python FastAPI** (회귀분석 API 서비스)

### 배포 단계

#### 1단계: Railway 프로젝트 생성

1. [Railway](https://railway.app/)에 로그인
2. "New Project" 클릭
3. "Deploy from GitHub repo" 선택
4. 이 레포지토리 연결

#### 2단계: Next.js 서비스 설정

Railway가 자동으로 Next.js를 감지합니다.

**환경 변수 설정** (Railway 대시보드 > Variables):
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PYTHON_API_URL=https://your-python-service.railway.internal
OPENAI_API_KEY=your-openai-key (선택사항)
```

#### 3단계: Python API 서비스 추가

1. Railway 프로젝트 대시보드에서 "New Service" 클릭
2. 같은 GitHub 레포지토리 선택
3. **Root Directory**를 `scripts/api`로 설정

**환경 변수 설정**:
```
ALLOWED_ORIGINS=https://your-nextjs-service.railway.app
PORT=8000
```

#### 4단계: 서비스 연결

Next.js 서비스의 `PYTHON_API_URL`을 Python 서비스의 내부 URL로 설정:
- Railway 내부 URL: `http://your-python-service.railway.internal:8000`
- 또는 공개 URL: `https://your-python-service.railway.app`

### Railway 환경 변수 요약

| 서비스 | 변수명 | 설명 |
|--------|--------|------|
| Next.js | `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| Next.js | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 |
| Next.js | `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 역할 키 (관리 API용) |
| Next.js | `PYTHON_API_URL` | Python API 서버 URL |
| Next.js | `OPENAI_API_KEY` | OpenAI API 키 (선택) |
| Python | `ALLOWED_ORIGINS` | CORS 허용 오리진 (쉼표 구분) |
| Python | `PORT` | 서버 포트 (Railway가 자동 설정) |

---

## 📁 프로젝트 구조

```
midcam_ontology_app/
├── app/                    # Next.js 앱 라우터
│   ├── admin/             # 관리자 페이지
│   ├── api/               # API 라우트
│   ├── data/              # 데이터 조회 페이지
│   └── upload/            # 파일 업로드 페이지
├── components/            # React 컴포넌트
├── lib/                   # 유틸리티 (Supabase 클라이언트)
├── scripts/
│   └── api/               # Python FastAPI 서버
│       ├── main.py        # FastAPI 메인 앱
│       ├── regression.py  # 회귀분석 로직
│       └── requirements.txt
└── utils/                 # 유틸리티 함수
```

---

## 📖 기능

- **데이터 업로드**: CSV 파일 업로드 및 자동 파싱
- **데이터 관리**: 회사/테이블별 데이터 관리
- **회귀분석**: 다중회귀분석 (Enter/Stepwise)
- **통계분석**: 기술통계, 상관분석, 상호작용 효과
- **LLM 해석**: AI 기반 분석 결과 해석 (OpenAI)

---

## 🔗 관련 문서

- [사용자 매뉴얼](./docs/USER_MANUAL.md)
- [Supabase 설정 SQL](./scripts/supabase-setup.sql)
