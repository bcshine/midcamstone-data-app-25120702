"use client";

// =====================================================
// 회귀분석 전용 페이지
// 데이터 테이블에서 회귀분석 버튼 클릭 시 이동
// =====================================================

import { useState, useEffect, use } from "react";
import Link from "next/link";
import RegressionPanel, { AnalysisParams } from "../../../../../components/RegressionPanel";
import RegressionResults, { RegressionResult, resultsToText } from "../../../../../components/RegressionResults";
import LLMInterpretation from "../../../../../components/LLMInterpretation";

export default function AnalysisPage({
  params,
}: {
  params: Promise<{ company: string; table: string }>;
}) {
  const { company, table } = use(params);
  const companyName = decodeURIComponent(company);
  const tableName = decodeURIComponent(table);

  // 상태 관리
  const [columns, setColumns] = useState<string[]>([]);
  const [allData, setAllData] = useState<Record<string, unknown>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 회귀분석 상태
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<RegressionResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // LLM 해석 모달 상태
  const [showLLMModal, setShowLLMModal] = useState(false);

  // 데이터 로드
  useEffect(() => {
    async function fetchTableData() {
      setIsLoading(true);
      try {
        // 전체 데이터 로드 (분석용, 최대 1000행)
        const res = await fetch(
          `/api/admin/tables/${tableName}?page=1&pageSize=1000`
        );
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "데이터 로드 실패");
          return;
        }

        setColumns(data.columns || []);
        setAllData(data.rows || []);
        setTotalRows(data.pagination?.totalRows || data.rows?.length || 0);
        setError(null);

      } catch (err) {
        setError("네트워크 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTableData();
  }, [tableName]);

  // 회귀분석 실행
  const handleRunAnalysis = async (params: AnalysisParams) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResults(null);

    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "regression",
          data: params.data,
          dependent_var: params.dependentVar,
          independent_vars: params.independentVars,
          method: params.method,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAnalysisError(data.error || "분석 중 오류가 발생했습니다.");
        return;
      }

      setAnalysisResults(data);

    } catch (err) {
      setAnalysisError("분석 서버에 연결할 수 없습니다. Python 서버가 실행 중인지 확인해주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 통계결과 복사
  const handleCopyResults = () => {
    if (!analysisResults) return;
    
    const text = resultsToText(analysisResults, companyName);
    navigator.clipboard.writeText(text).then(() => {
      alert("통계결과가 클립보드에 복사되었습니다.");
    }).catch(() => {
      alert("복사에 실패했습니다.");
    });
  };

  // AI 해석 모달 열기
  const handleRequestInterpretation = () => {
    setShowLLMModal(true);
  };

  // 숫자 포맷팅
  const formatNumber = (num: number) => {
    return num.toLocaleString("ko-KR");
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
          <Link
            href={`/admin/${encodeURIComponent(companyName)}/${encodeURIComponent(tableName)}`}
            className="text-slate-400 hover:text-cyan-400 transition-colors"
          >
            {tableName}
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-purple-400">회귀분석</span>
        </nav>

        {/* 헤더 */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <span className="text-4xl">📊</span>
                다중회귀분석
              </h1>
              <p className="text-slate-400">
                {companyName} - {tableName}
                {totalRows > 0 && (
                  <span className="ml-2 text-cyan-400">
                    (총 {formatNumber(totalRows)}행)
                  </span>
                )}
              </p>
            </div>

            {/* 데이터 보기 버튼 */}
            <Link
              href={`/admin/${encodeURIComponent(companyName)}/${encodeURIComponent(tableName)}`}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-all flex items-center gap-2"
            >
              📋 데이터 보기
            </Link>
          </div>
        </header>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            <p className="mt-4 text-slate-400">데이터 로드 중...</p>
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 text-center">
            <p className="text-red-400">{error}</p>
            <Link
              href={`/admin/${encodeURIComponent(companyName)}/${encodeURIComponent(tableName)}`}
              className="inline-block mt-4 text-cyan-400 hover:underline"
            >
              데이터 페이지로 돌아가기
            </Link>
          </div>
        )}

        {/* 회귀분석 섹션 */}
        {!isLoading && !error && allData.length > 0 && (
          <div className="space-y-6">
            {/* 회귀분석 설정 패널 */}
            <RegressionPanel
              companyName={companyName}
              columns={columns}
              data={allData as Record<string, any>[]}
              onRunAnalysis={handleRunAnalysis}
              isLoading={isAnalyzing}
            />

            {/* 분석 결과 (SPSS 스타일) */}
            <RegressionResults
              results={analysisResults}
              error={analysisError}
              companyName={companyName}
              onCopyResults={handleCopyResults}
              onRequestInterpretation={handleRequestInterpretation}
            />
          </div>
        )}

        {/* 푸터 */}
        <footer className="mt-16 text-center text-slate-500 text-sm">
          <Link 
            href={`/admin/${encodeURIComponent(companyName)}/${encodeURIComponent(tableName)}`}
            className="hover:text-cyan-400 transition-colors"
          >
            ← 데이터 페이지로 돌아가기
          </Link>
        </footer>
      </div>

      {/* LLM 해석 모달 */}
      <LLMInterpretation
        isOpen={showLLMModal}
        onClose={() => setShowLLMModal(false)}
        results={analysisResults}
        companyName={companyName}
      />
    </main>
  );
}

