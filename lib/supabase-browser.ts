// =====================================================
// 브라우저용 Supabase 클라이언트
// 클라이언트 컴포넌트에서 인증에 사용합니다.
// =====================================================

import { createClient } from "@supabase/supabase-js";

// 환경 변수에서 Supabase 설정 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 브라우저용 Supabase 클라이언트 생성
// anon key 사용 (공개 키, RLS 적용됨)
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);

// 기본 export
export default supabaseBrowser;


