-- =====================================================
-- Supabase 초기 설정 SQL
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- =====================================================

-- 1. upload_logs 테이블 생성 (업로드 내역 관리)
-- 각 업로드마다 회사명, 파일명, 테이블명, 업로드 시간 등을 기록합니다.
CREATE TABLE IF NOT EXISTS public.upload_logs (
  id BIGSERIAL PRIMARY KEY,                    -- 자동 증가 ID
  company_name TEXT NOT NULL,                   -- 회사명 (한글)
  file_name TEXT NOT NULL,                      -- 원본 파일명
  table_name TEXT NOT NULL,                     -- 생성된 테이블명
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),        -- 업로드 시간
  row_count INTEGER DEFAULT 0,                  -- 업로드된 행 수
  file_date TEXT                                -- 파일에서 추출한 날짜 (YYMMDD)
);

-- upload_logs 테이블에 인덱스 추가 (회사명으로 빠른 검색)
CREATE INDEX IF NOT EXISTS idx_upload_logs_company 
  ON public.upload_logs(company_name);

-- 2. exec_sql 함수 생성 (동적 SQL 실행용)
-- 주의: 이 함수는 Service Role Key로만 호출 가능합니다.
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- 3. 함수 실행 권한 설정
-- Service Role만 exec_sql 함수를 실행할 수 있도록 설정
REVOKE ALL ON FUNCTION exec_sql(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION exec_sql(TEXT) FROM anon;
REVOKE ALL ON FUNCTION exec_sql(TEXT) FROM authenticated;

-- 4. upload_logs 테이블 RLS (Row Level Security) 설정
-- 모든 사용자가 읽기/쓰기 가능하도록 설정 (인증 없음)
ALTER TABLE public.upload_logs ENABLE ROW LEVEL SECURITY;

-- 모든 사용자 읽기 허용
CREATE POLICY "upload_logs_select_policy" 
  ON public.upload_logs 
  FOR SELECT 
  USING (true);

-- 모든 사용자 삽입 허용
CREATE POLICY "upload_logs_insert_policy" 
  ON public.upload_logs 
  FOR INSERT 
  WITH CHECK (true);

-- =====================================================
-- 설정 완료!
-- 이제 Next.js 앱에서 CSV 업로드 기능을 사용할 수 있습니다.
-- =====================================================








