"use client";

// =====================================================
// 관리 대시보드 페이지 (관리자 전용)
// 고객사 목록을 카드 형태로 표시합니다.
// =====================================================

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthGuard from "../../components/AuthGuard";
import { signOut } from "../../lib/auth";

// 고객사 정보 타입
interface CompanyInfo {
  companyName: string;
  fileCount: number;
  totalRows: number;
  lastUpload: string;
  tables: Array<{
    tableName: string;
    fileName: string;
    fileDate: string;
    rowCount: number;
    uploadedAt: string;
  }>;
}

function AdminDashboardContent() {
  const router = useRouter();

  // 로그아웃 핸들러
  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };
  // 상태 관리
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 데이터 로드
  useEffect(() => {
    async function fetchCompanies() {
      try {
        const res = await fetch("/api/admin/companies");
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "데이터 로드 실패");
          return;
        }

        setCompanies(data.companies || []);
      } catch (err) {
        setError("네트워크 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchCompanies();
  }, []);

  // 날짜 포맷팅
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 숫자 포맷팅
  const formatNumber = (num: number) => {
    return num.toLocaleString("ko-KR");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* 상단 네비게이션 바 */}
        <div className="flex flex-wrap items-center justify-end gap-2 mb-4 md:mb-6">
          <Link
            href="/"
            className="px-2 py-1.5 md:px-4 md:py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-xs md:text-sm transition-colors"
          >
            관리자 홈
          </Link>
          <Link
            href="/admin/trash"
            className="px-2 py-1.5 md:px-4 md:py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-xs md:text-sm transition-colors"
          >
            🗑️ 휴지통
          </Link>
          <Link
            href="/settings"
            className="px-2 py-1.5 md:px-4 md:py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-xs md:text-sm transition-colors"
          >
            ⚙️ 설정
          </Link>
          <button
            onClick={handleLogout}
            className="px-2 py-1.5 md:px-4 md:py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-xs md:text-sm transition-colors"
          >
            로그아웃
          </button>
        </div>

        {/* 헤더 */}
        <header className="mb-6 md:mb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-4xl font-bold mb-1 md:mb-2 bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
                📊 고객사 데이터 관리
              </h1>
              <p className="text-slate-400 text-xs md:text-base">
                업로드된 고객사 데이터를 확인하고 관리합니다
              </p>
            </div>
            <Link
              href="/upload"
              className="px-4 py-2 md:px-6 md:py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg md:rounded-xl text-sm md:text-base font-medium transition-colors text-center whitespace-nowrap"
            >
              + 새 업로드
            </Link>
          </div>
        </header>

        {/* 통계 요약 */}
        <div className="grid grid-cols-3 gap-2 md:gap-6 mb-6 md:mb-10">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 md:p-6">
            <div className="text-xl md:text-3xl font-bold text-emerald-400">
              {companies.length}
            </div>
            <div className="text-slate-400 mt-1 text-xs md:text-base">등록된 고객사</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 md:p-6">
            <div className="text-xl md:text-3xl font-bold text-cyan-400">
              {companies.reduce((sum, c) => sum + c.fileCount, 0)}
            </div>
            <div className="text-slate-400 mt-1 text-xs md:text-base">총 업로드 파일</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 md:p-6">
            <div className="text-xl md:text-3xl font-bold text-purple-400">
              {formatNumber(companies.reduce((sum, c) => sum + c.totalRows, 0))}
            </div>
            <div className="text-slate-400 mt-1 text-xs md:text-base">총 데이터 행</div>
          </div>
        </div>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
            <p className="mt-4 text-slate-400">데이터 로드 중...</p>
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* 고객사 카드 목록 */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.length === 0 ? (
              <div className="col-span-full text-center py-20 bg-slate-800/30 rounded-xl border border-slate-700">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-slate-400 text-lg">아직 업로드된 데이터가 없습니다</p>
                <Link
                  href="/upload"
                  className="inline-block mt-4 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-medium transition-colors"
                >
                  첫 데이터 업로드하기
                </Link>
              </div>
            ) : (
              companies.map((company) => (
                <Link
                  key={company.companyName}
                  href={`/admin/${encodeURIComponent(company.companyName)}`}
                  className="group bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-cyan-500 hover:bg-slate-800 transition-all duration-300"
                >
                  {/* 회사명 */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-2xl">
                      🏢
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                        {company.companyName}
                      </h2>
                      <p className="text-slate-500 text-sm">
                        마지막 업로드: {formatDate(company.lastUpload)}
                      </p>
                    </div>
                  </div>

                  {/* 통계 */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-emerald-400">
                        {company.fileCount}
                      </div>
                      <div className="text-slate-500 text-sm">파일 수</div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-purple-400">
                        {formatNumber(company.totalRows)}
                      </div>
                      <div className="text-slate-500 text-sm">총 행 수</div>
                    </div>
                  </div>

                  {/* 화살표 */}
                  <div className="mt-4 text-right">
                    <span className="text-slate-500 group-hover:text-cyan-400 transition-colors">
                      상세보기 →
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {/* 처음으로 돌아가기 버튼 */}
        <div className="mt-10 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors"
          >
            ← 처음으로 돌아가기
          </Link>
        </div>

        {/* 푸터 */}
        <footer className="mt-6 text-center text-slate-500 text-sm">
          <p>Powered by Supabase & Next.js</p>
        </footer>
      </div>
    </main>
  );
}

// AuthGuard로 감싸는 wrapper 컴포넌트
export default function AdminDashboard() {
  return (
    <AuthGuard allowedRoles={["admin"]}>
      <AdminDashboardContent />
    </AuthGuard>
  );
}

