"use client";

// =====================================================
// 메인 페이지 (관리자 전용)
// 업로드 페이지와 관리 페이지로 이동하는 대시보드입니다.
// =====================================================

import Link from "next/link";
import AuthGuard from "../components/AuthGuard";
import { signOut } from "../lib/auth";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  // 로그아웃 핸들러
  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <AuthGuard allowedRoles={["admin"]}>
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
        <div className="max-w-2xl text-center">
          {/* 상단 네비게이션 */}
          <div className="absolute top-8 right-8 flex items-center gap-4">
            <Link
              href="/settings"
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-sm transition-colors"
            >
              ⚙️ 설정
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-sm transition-colors"
            >
              로그아웃
            </button>
          </div>

          {/* 로고/타이틀 */}
          <div className="mb-8">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              중간계 AI 연구소
            </h1>
            <h2 className="text-2xl text-slate-300 font-light">
              데이터 분석 플랫폼
            </h2>
            <p className="mt-2 text-emerald-400 text-sm">👤 관리자 모드</p>
          </div>

          {/* 설명 */}
          <p className="text-slate-400 text-lg mb-10 leading-relaxed">
            고객사의 매출 데이터를 수집하여<br />
            회귀분석을 통한 인사이트를 제공합니다.
          </p>

          {/* 기능 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* CSV 업로드 카드 */}
            <Link 
              href="/upload"
              className="group block p-6 bg-slate-800/50 border border-slate-700 rounded-2xl hover:border-cyan-500 hover:bg-slate-800 transition-all duration-300"
            >
              <div className="text-4xl mb-4">📤</div>
              <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                CSV 업로드
              </h3>
              <p className="text-slate-400 text-sm">
                매출 데이터 CSV 파일을<br />Supabase에 저장합니다
              </p>
            </Link>

            {/* 데이터 관리 카드 */}
            <Link 
              href="/admin"
              className="group block p-6 bg-slate-800/50 border border-slate-700 rounded-2xl hover:border-emerald-500 hover:bg-slate-800 transition-all duration-300"
            >
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                데이터 관리
              </h3>
              <p className="text-slate-400 text-sm">
                고객사별 업로드 데이터<br />조회 및 관리
              </p>
            </Link>

            {/* 데이터 분석 카드 (추후 구현) */}
            <div className="p-6 bg-slate-800/30 border border-slate-700/50 rounded-2xl opacity-60 cursor-not-allowed">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-xl font-semibold text-slate-500 mb-2">
                데이터 분석
              </h3>
              <p className="text-slate-500 text-sm">
                회귀분석 및 시각화<br />(준비 중)
              </p>
            </div>
          </div>

          {/* CTA 버튼 */}
          <Link
            href="/upload"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-lg rounded-xl shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:scale-105"
          >
            <span>시작하기</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>

          {/* 푸터 */}
          <footer className="mt-16 text-slate-600 text-sm">
            <p>Powered by Supabase & Next.js</p>
          </footer>
        </div>
      </main>
    </AuthGuard>
  );
}
