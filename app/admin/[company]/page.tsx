"use client";

// =====================================================
// 고객사 상세 페이지
// 해당 고객사의 업로드 내역을 표시합니다.
// =====================================================

import { useState, useEffect, use } from "react";
import Link from "next/link";

// 테이블 정보 타입
interface TableInfo {
  tableName: string;
  fileName: string;
  fileDate: string;
  rowCount: number;
  uploadedAt: string;
}

// 고객사 정보 타입
interface CompanyInfo {
  companyName: string;
  fileCount: number;
  totalRows: number;
  lastUpload: string;
  tables: TableInfo[];
}

export default function CompanyDetailPage({
  params,
}: {
  params: Promise<{ company: string }>;
}) {
  const { company } = use(params);
  const companyName = decodeURIComponent(company);

  // 상태 관리
  const [companyData, setCompanyData] = useState<CompanyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);  // 삭제 대상 테이블
  const [isDeleting, setIsDeleting] = useState(false);  // 삭제 중 상태

  // 데이터 로드
  useEffect(() => {
    async function fetchCompanyData() {
      try {
        const res = await fetch("/api/admin/companies");
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "데이터 로드 실패");
          return;
        }

        // 해당 회사 찾기
        const found = data.companies?.find(
          (c: CompanyInfo) => c.companyName === companyName
        );

        if (!found) {
          setError(`"${companyName}" 고객사를 찾을 수 없습니다.`);
          return;
        }

        setCompanyData(found);
      } catch (err) {
        setError("네트워크 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchCompanyData();
  }, [companyName]);

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

  // 날짜 코드 포맷팅 (YYMMDD → YY년 MM월 DD일)
  const formatFileDate = (dateCode: string) => {
    if (!dateCode || dateCode.length !== 6) return dateCode;
    const yy = dateCode.substring(0, 2);
    const mm = dateCode.substring(2, 4);
    const dd = dateCode.substring(4, 6);
    return `20${yy}년 ${mm}월 ${dd}일`;
  };

  // 데이터 새로고침
  const refreshData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/companies");
      const data = await res.json();
      if (res.ok) {
        const found = data.companies?.find(
          (c: CompanyInfo) => c.companyName === companyName
        );
        setCompanyData(found || null);
      }
    } catch (err) {
      console.error("새로고침 오류:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 삭제 핸들러
  const handleDelete = async (tableName: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/admin/tables/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableName }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`삭제 실패: ${data.error}`);
        return;
      }

      alert(data.message);
      setDeleteTarget(null);
      
      // 데이터 새로고침
      await refreshData();
    } catch (err) {
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* 네비게이션 */}
        <nav className="mb-6">
          <Link
            href="/admin"
            className="text-slate-400 hover:text-cyan-400 transition-colors"
          >
            ← 고객사 목록으로
          </Link>
        </nav>

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
            <Link
              href="/admin"
              className="inline-block mt-4 text-cyan-400 hover:underline"
            >
              목록으로 돌아가기
            </Link>
          </div>
        )}

        {/* 고객사 정보 */}
        {!isLoading && !error && companyData && (
          <>
            {/* 헤더 */}
            <header className="mb-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-3xl">
                  🏢
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white">
                    {companyData.companyName}
                  </h1>
                  <p className="text-slate-400">
                    마지막 업로드: {formatDate(companyData.lastUpload)}
                  </p>
                </div>
              </div>
            </header>

            {/* 통계 요약 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="text-3xl font-bold text-emerald-400">
                  {companyData.fileCount}
                </div>
                <div className="text-slate-400 mt-1">업로드된 파일</div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="text-3xl font-bold text-purple-400">
                  {formatNumber(companyData.totalRows)}
                </div>
                <div className="text-slate-400 mt-1">총 데이터 행</div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="text-3xl font-bold text-cyan-400">
                  {companyData.tables.length}
                </div>
                <div className="text-slate-400 mt-1">테이블 수</div>
              </div>
            </div>

            {/* 업로드 파일 목록 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-6">📁 업로드된 파일 목록</h2>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">
                        파일명
                      </th>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">
                        데이터 날짜
                      </th>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">
                        행 수
                      </th>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">
                        업로드 시간
                      </th>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyData.tables.map((table, index) => (
                      <tr
                        key={`${table.tableName}-${index}`}
                        className={`border-b border-slate-700/50 hover:bg-slate-700/30 ${
                          index % 2 === 0 ? "bg-slate-900/20" : ""
                        }`}
                      >
                        <td className="px-4 py-4">
                          <div className="font-medium text-white">
                            {table.fileName}
                          </div>
                          <div className="text-sm text-slate-500">
                            {table.tableName}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-300">
                          {formatFileDate(table.fileDate)}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-emerald-400 font-medium">
                            {formatNumber(table.rowCount)}행
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-400">
                          {formatDate(table.uploadedAt)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/${encodeURIComponent(companyName)}/${table.tableName}`}
                              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium transition-colors"
                            >
                              데이터 보기
                            </Link>
                            <button
                              onClick={() => setDeleteTarget(table.tableName)}
                              className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium transition-colors"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* 푸터 */}
        <footer className="mt-16 text-center text-slate-500 text-sm">
          <Link href="/" className="hover:text-cyan-400 transition-colors">
            ← 홈으로 돌아가기
          </Link>
        </footer>
      </div>

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">
              🗑️ 휴지통으로 이동
            </h3>
            <p className="text-slate-300 mb-2">
              이 데이터를 휴지통으로 이동하시겠습니까?
            </p>
            <p className="text-cyan-400 font-mono text-sm mb-6 p-3 bg-slate-900 rounded-lg">
              {deleteTarget}
            </p>
            <p className="text-emerald-400 text-sm mb-6">
              💡 휴지통에서 30일 후 자동 삭제됩니다. 그 전에 복원할 수 있습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-slate-600 hover:bg-slate-500 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-500 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isDeleting ? "이동 중..." : "휴지통으로 이동"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

