"use client";

// =====================================================
// 회귀분석 설정 패널 컴포넌트
// 종속변수, 독립변수, 분석 방법 선택
// =====================================================

import { useState, useMemo } from "react";

// Props 타입
interface RegressionPanelProps {
  companyName: string;
  columns: string[];          // 테이블 컬럼 목록
  data: Record<string, any>[]; // 테이블 데이터
  onRunAnalysis: (params: AnalysisParams) => void;
  isLoading: boolean;
}

// 분석 파라미터 타입
export interface AnalysisParams {
  dependentVar: string;
  independentVars: string[];
  method: "enter" | "stepwise";
  data: Record<string, any>[];
}

export default function RegressionPanel({
  companyName,
  columns,
  data,
  onRunAnalysis,
  isLoading,
}: RegressionPanelProps) {
  // 상태 관리
  const [dependentVar, setDependentVar] = useState<string>("");
  const [independentVars, setIndependentVars] = useState<string[]>([]);
  const [method, setMethod] = useState<"enter" | "stepwise">("enter");

  // 숫자형 컬럼만 필터링 (id 제외)
  const numericColumns = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return columns.filter((col) => {
      // id 컬럼 제외
      if (col.toLowerCase() === "id") return false;
      
      // 숫자형인지 확인
      const sampleValue = data[0][col];
      return !isNaN(Number(sampleValue));
    });
  }, [columns, data]);

  // 독립변수 토글
  const toggleIndependentVar = (varName: string) => {
    setIndependentVars((prev) =>
      prev.includes(varName)
        ? prev.filter((v) => v !== varName)
        : [...prev, varName]
    );
  };

  // 전체 선택/해제
  const toggleAllIndependent = () => {
    const availableVars = numericColumns.filter((col) => col !== dependentVar);
    
    if (independentVars.length === availableVars.length) {
      setIndependentVars([]);
    } else {
      setIndependentVars(availableVars);
    }
  };

  // 분석 실행
  const handleRun = () => {
    if (!dependentVar || independentVars.length === 0) return;
    
    onRunAnalysis({
      dependentVar,
      independentVars,
      method,
      data,
    });
  };

  // 분석 가능 여부
  const canRun = dependentVar && independentVars.length > 0 && !isLoading;

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            📊 다중회귀분석
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {companyName} 데이터 분석
          </p>
        </div>
        
        {/* 데이터 정보 */}
        <div className="text-right">
          <p className="text-slate-300 text-sm">
            데이터: <span className="text-cyan-400 font-medium">{data.length}행</span>
          </p>
          <p className="text-slate-300 text-sm">
            변수: <span className="text-cyan-400 font-medium">{numericColumns.length}개</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 왼쪽: 변수 선택 */}
        <div className="space-y-4">
          {/* 종속변수 선택 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              종속변수 (Y) 선택
            </label>
            <select
              value={dependentVar}
              onChange={(e) => {
                setDependentVar(e.target.value);
                // 종속변수가 독립변수에 있으면 제거
                setIndependentVars((prev) =>
                  prev.filter((v) => v !== e.target.value)
                );
              }}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">-- 종속변수 선택 --</option>
              {numericColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          {/* 독립변수 선택 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">
                독립변수 (X) 선택
              </label>
              <button
                onClick={toggleAllIndependent}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                {independentVars.length === numericColumns.filter(c => c !== dependentVar).length
                  ? "전체 해제"
                  : "전체 선택"}
              </button>
            </div>
            
            <div className="bg-slate-900 border border-slate-600 rounded-xl p-4 max-h-48 overflow-y-auto">
              {numericColumns
                .filter((col) => col !== dependentVar)
                .map((col) => (
                  <label
                    key={col}
                    className="flex items-center gap-3 py-2 cursor-pointer hover:bg-slate-800 px-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={independentVars.includes(col)}
                      onChange={() => toggleIndependentVar(col)}
                      className="w-4 h-4 rounded bg-slate-700 border-slate-500 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span className="text-slate-300">{col}</span>
                  </label>
                ))}
              
              {numericColumns.filter((col) => col !== dependentVar).length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">
                  종속변수를 먼저 선택해주세요
                </p>
              )}
            </div>
            
            <p className="mt-2 text-slate-500 text-xs">
              선택됨: {independentVars.length}개
            </p>
          </div>
        </div>

        {/* 오른쪽: 옵션 및 실행 */}
        <div className="space-y-4">
          {/* 분석 방법 선택 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              분석 방법
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-600 rounded-xl cursor-pointer hover:border-slate-500">
                <input
                  type="radio"
                  name="method"
                  value="enter"
                  checked={method === "enter"}
                  onChange={() => setMethod("enter")}
                  className="w-4 h-4 text-cyan-500 focus:ring-cyan-500"
                />
                <div>
                  <span className="text-white font-medium">Enter (입력)</span>
                  <p className="text-slate-400 text-xs">
                    모든 독립변수를 한 번에 투입
                  </p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-600 rounded-xl cursor-pointer hover:border-slate-500">
                <input
                  type="radio"
                  name="method"
                  value="stepwise"
                  checked={method === "stepwise"}
                  onChange={() => setMethod("stepwise")}
                  className="w-4 h-4 text-cyan-500 focus:ring-cyan-500"
                />
                <div>
                  <span className="text-white font-medium">Stepwise (단계적)</span>
                  <p className="text-slate-400 text-xs">
                    유의한 변수만 자동 선택
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* 선택 요약 */}
          <div className="bg-slate-900/50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-2">분석 설정</h3>
            <div className="space-y-1 text-sm">
              <p className="text-slate-300">
                <span className="text-slate-500">Y:</span>{" "}
                <span className="text-cyan-400">{dependentVar || "-"}</span>
              </p>
              <p className="text-slate-300">
                <span className="text-slate-500">X:</span>{" "}
                <span className="text-cyan-400">
                  {independentVars.length > 0
                    ? independentVars.join(", ")
                    : "-"}
                </span>
              </p>
              <p className="text-slate-300">
                <span className="text-slate-500">방법:</span>{" "}
                <span className="text-cyan-400">
                  {method === "enter" ? "Enter" : "Stepwise"}
                </span>
              </p>
            </div>
          </div>

          {/* 실행 버튼 */}
          <button
            onClick={handleRun}
            disabled={!canRun}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              canRun
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25"
                : "bg-slate-700 cursor-not-allowed"
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                분석 중...
              </span>
            ) : (
              "🚀 분석 실행"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


