"use client";

// =====================================================
// 테이블 데이터 조회 페이지
// 특정 테이블의 데이터를 페이지네이션하여 표시합니다.
// 회귀분석은 별도 페이지에서 진행합니다.
// =====================================================

import { useState, useEffect, use } from "react";
import Link from "next/link";

// 페이지네이션 정보 타입
interface Pagination {
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
}

export default function TableViewPage({
  params,
}: {
  params: Promise<{ company: string; table: string }>;
}) {
  const { company, table } = use(params);
  const companyName = decodeURIComponent(company);
  const tableName = decodeURIComponent(table);

  // 상태 관리
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 데이터 로드
  useEffect(() => {
    async function fetchTableData() {
      setIsLoading(true);
      try {
        // 페이지 데이터 로드
        const res = await fetch(
          `/api/admin/tables/${tableName}?page=${currentPage}&pageSize=50`
        );
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "데이터 로드 실패");
          return;
        }

        setColumns(data.columns || []);
        setRows(data.rows || []);
        setPagination(data.pagination);
        setError(null);

      } catch (err) {
        setError("네트워크 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTableData();
  }, [tableName, currentPage]);

  // 숫자 포맷팅
  const formatNumber = (num: number) => {
    return num.toLocaleString("ko-KR");
  };

  // 셀 값 포맷팅
  const formatCellValue = (value: unknown): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "number") return formatNumber(value);
    return String(value);
  };

  // 페이지 변경
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= (pagination?.totalPages || 1)) {
      setCurrentPage(newPage);
    }
  };

  // 페이지 버튼 생성
  const getPageButtons = () => {
    if (!pagination) return [];
    const { page, totalPages } = pagination;
    const buttons: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) buttons.push(i);
    } else {
      buttons.push(1);
      if (page > 3) buttons.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        buttons.push(i);
      }
      if (page < totalPages - 2) buttons.push("...");
      buttons.push(totalPages);
    }

    return buttons;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* 네비게이션 */}
        <nav className="mb-6 flex items-center gap-2 text-sm">
          <Link
            href="/admin"
            className="text-slate-400 hover:text-cyan-400 transition-colors"
          >
            고객사 목록
          </Link>
          <span className="text-slate-600">/</span>
          <Link
            href={`/admin/${encodeURIComponent(companyName)}`}
            className="text-slate-400 hover:text-cyan-400 transition-colors"
          >
            {companyName}
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-white">{tableName}</span>
        </nav>

        {/* 헤더 */}
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              📋 {tableName}
            </h1>
            <p className="text-slate-400">
              {companyName} 고객사의 데이터
              {pagination && (
                <span className="ml-2 text-cyan-400">
                  (총 {formatNumber(pagination.totalRows)}행)
                </span>
              )}
            </p>
          </div>

          {/* 회귀분석 버튼 (새 페이지로 이동) */}
          {!isLoading && !error && rows.length > 0 && (
            <Link
              href={`/admin/${encodeURIComponent(companyName)}/${encodeURIComponent(tableName)}/analysis`}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 rounded-xl font-medium transition-all shadow-lg shadow-purple-500/25 flex items-center gap-2"
            >
              📊 회귀분석
            </Link>
          )}
        </header>

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
              href={`/admin/${encodeURIComponent(companyName)}`}
              className="inline-block mt-4 text-cyan-400 hover:underline"
            >
              목록으로 돌아가기
            </Link>
          </div>
        )}

        {/* 데이터 테이블 */}
        {!isLoading && !error && (
          <>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900/50">
                    <tr>
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="text-left px-4 py-3 text-cyan-400 font-medium whitespace-nowrap border-b border-slate-700"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={columns.length}
                          className="text-center py-10 text-slate-400"
                        >
                          데이터가 없습니다
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className={`border-b border-slate-700/50 hover:bg-slate-700/30 ${
                            rowIndex % 2 === 0 ? "bg-slate-900/20" : ""
                          }`}
                        >
                          {columns.map((col) => (
                            <td
                              key={col}
                              className="px-4 py-3 text-slate-300 whitespace-nowrap max-w-[200px] truncate"
                              title={formatCellValue(row[col])}
                            >
                              {formatCellValue(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 페이지네이션 */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mb-10">
                {/* 이전 버튼 */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentPage === 1
                      ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                      : "bg-slate-700 hover:bg-slate-600 text-white"
                  }`}
                >
                  ←
                </button>

                {/* 페이지 버튼 */}
                {getPageButtons().map((btn, index) => (
                  <button
                    key={index}
                    onClick={() => typeof btn === "number" && handlePageChange(btn)}
                    disabled={btn === "..."}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      btn === currentPage
                        ? "bg-cyan-600 text-white"
                        : btn === "..."
                        ? "bg-transparent text-slate-500 cursor-default"
                        : "bg-slate-700 hover:bg-slate-600 text-white"
                    }`}
                  >
                    {btn}
                  </button>
                ))}

                {/* 다음 버튼 */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pagination.totalPages}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentPage === pagination.totalPages
                      ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                      : "bg-slate-700 hover:bg-slate-600 text-white"
                  }`}
                >
                  →
                </button>

                {/* 페이지 정보 */}
                <span className="ml-4 text-slate-400 text-sm">
                  {currentPage} / {pagination.totalPages} 페이지
                </span>
              </div>
            )}
          </>
        )}

        {/* 푸터 */}
        <footer className="mt-16 text-center text-slate-500 text-sm">
          <Link href="/" className="hover:text-cyan-400 transition-colors">
            ← 홈으로 돌아가기
          </Link>
        </footer>
      </div>
    </main>
  );
}
