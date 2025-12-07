"use client";

// =====================================================
// LLM 해석 모달 컴포넌트
// AI 결과해석 버튼 클릭 시 모달로 표시
// =====================================================

import { useState, useEffect } from "react";
import { RegressionResult } from "./RegressionResults";

interface LLMInterpretationProps {
  isOpen: boolean;
  onClose: () => void;
  results: RegressionResult | null;
  companyName: string;
}

// 모델 정보
interface ModelInfo {
  id: string;
  name: string;
}

export default function LLMInterpretation({ 
  isOpen, 
  onClose, 
  results, 
  companyName 
}: LLMInterpretationProps) {
  // 상태 관리
  const [models, setModels] = useState<ModelInfo[]>([
    { id: "gpt-4o-mini", name: "GPT-4o Mini (빠르고 경제적)" },
    { id: "gpt-4o", name: "GPT-4o (균형잡힌 성능)" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo (고성능)" },
  ]);
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ prompt_tokens: number; completion_tokens: number } | null>(null);

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      setInterpretation(null);
      setError(null);
      setUsage(null);
    }
  }, [isOpen]);

  // 해석 요청
  const handleInterpret = async () => {
    if (!results) return;

    setIsLoading(true);
    setError(null);
    setInterpretation(null);

    try {
      const res = await fetch("/api/analysis/interpret", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          results,
          model: selectedModel,
          companyName,
          language: "ko",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "해석 중 오류가 발생했습니다.");
        return;
      }

      setInterpretation(data.interpretation);
      setUsage(data.usage);

    } catch (err) {
      setError("해석 요청 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 모달이 닫혀있으면 렌더링 안함
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 내용 */}
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              🤖 AI 결과해석
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              ChatGPT가 회귀분석 결과를 해석합니다
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* 모델 선택 및 실행 (해석 전) */}
          {!interpretation && !isLoading && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  AI 모델 선택
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-900/50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-slate-400 mb-2">분석 정보</h3>
                <div className="text-sm text-slate-300 space-y-1">
                  <p>• 고객사: <span className="text-cyan-400">{companyName}</span></p>
                  <p>• 종속변수: <span className="text-cyan-400">{results?.dependent_variable}</span></p>
                  <p>• 독립변수: <span className="text-cyan-400">{results?.independent_variables.join(", ")}</span></p>
                  <p>• R² = <span className="text-cyan-400">{results?.model_summary.r_squared.toFixed(4)}</span></p>
                </div>
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="bg-red-900/30 border border-red-700 rounded-xl p-4">
                  <p className="text-red-400">❌ {error}</p>
                </div>
              )}

              <button
                onClick={handleInterpret}
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 rounded-xl font-semibold text-white transition-all shadow-lg shadow-purple-500/25"
              >
                ✨ 해석 생성하기
              </button>
            </div>
          )}

          {/* 로딩 상태 */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mb-4"></div>
              <p className="text-slate-400">AI가 결과를 분석하고 있습니다...</p>
              <p className="text-slate-500 text-sm mt-2">잠시만 기다려주세요</p>
            </div>
          )}

          {/* 해석 결과 */}
          {interpretation && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">📝 해석 결과</h3>
                {usage && (
                  <span className="text-xs text-slate-500">
                    토큰: {usage.prompt_tokens + usage.completion_tokens}
                  </span>
                )}
              </div>
              
              <div className="bg-slate-900/50 rounded-xl p-6">
                <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {interpretation}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(interpretation);
                    alert("클립보드에 복사되었습니다.");
                  }}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium text-white transition-colors"
                >
                  📋 복사하기
                </button>
                <button
                  onClick={() => {
                    setInterpretation(null);
                    setError(null);
                  }}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-medium text-white transition-colors"
                >
                  🔄 다시 해석
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
