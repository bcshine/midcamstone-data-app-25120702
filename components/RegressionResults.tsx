"use client";

// =====================================================
// 회귀분석 결과 표시 컴포넌트 (업그레이드 버전)
// superbase_link/app.py 스타일 결과 표시
// 
// 주요 기능:
// - 주요 변수 산점도 그래프
// - 2-way 상호작용 효과 표시
// - 잔차 진단 (Jarque-Bera, 이상치 분석)
// - 사분위수 (Q1, Q3) 표시
// - 제거된 변수 표시
// =====================================================

import { useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  LineChart,
  Line,
  ComposedChart,
  Bar,
} from "recharts";

// 결과 타입 (업그레이드)
export interface RegressionResult {
  success: boolean;
  method: string;
  n_observations: number;
  dependent_variable: string;
  independent_variables: string[];
  final_main_vars: string[];
  interaction_terms: string[];
  removed_vars: string[];
  regression_equation: string;
  model_summary: {
    r: number;
    r_squared: number;
    adj_r_squared: number;
    std_error_estimate: number;
    durbin_watson: number;
    f_statistic: number;
    f_pvalue: number;
    aic: number;
    bic: number;
    log_likelihood: number;
  };
  anova_table: Array<{
    source: string;
    ss: number;
    df: number;
    ms: number | null;
    f: number | null;
    p_value: number | null;
  }>;
  coefficients: Array<{
    variable: string;
    b: number;
    std_error: number;
    beta: number | null;
    t_statistic: number;
    p_value: number;
    tolerance: number | null;
    vif: number | null;
    var_type: string;
  }>;
  descriptive_stats: Array<{
    variable: string;
    n: number;
    mean: number;
    std: number;
    min: number;
    q25: number;
    median: number;
    q75: number;
    max: number;
    skewness: number;
    kurtosis: number;
  }>;
  correlation_matrix: Array<Record<string, any>>;
  residual_stats: {
    mean: number;
    std: number;
    min: number;
    max: number;
    skewness: number;
    kurtosis: number;
    durbin_watson: number;
    jarque_bera_stat: number;
    jarque_bera_pvalue: number;
    outliers_count: number;
    outliers_percent: number;
  };
  actual_vs_predicted: Array<{
    index: number;
    actual: number;
    predicted: number;
    residual: number;
  }>;
  scatter_data: Record<string, Array<{ x: number; y: number }>>;
  interpretation: string;
}

interface RegressionResultsProps {
  results: RegressionResult | null;
  error: string | null;
  companyName: string;
  onCopyResults: () => void;
  onRequestInterpretation: () => void;
}

export default function RegressionResults({ 
  results, 
  error, 
  companyName,
  onCopyResults,
  onRequestInterpretation
}: RegressionResultsProps) {
  // 에러 표시
  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-xl p-6">
        <h3 className="text-red-400 font-semibold mb-2">❌ 분석 오류</h3>
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  // 결과 없음
  if (!results) {
    return null;
  }

  // 숫자 포맷팅
  const formatNumber = (num: number | null | undefined, decimals: number = 4): string => {
    if (num === null || num === undefined) return "-";
    return num.toFixed(decimals);
  };

  // 큰 숫자 포맷팅 (천 단위 콤마)
  const formatLargeNumber = (num: number | null | undefined, decimals: number = 4): string => {
    if (num === null || num === undefined) return "-";
    return num.toLocaleString('ko-KR', { maximumFractionDigits: decimals });
  };

  // p-value 포맷팅
  const formatPValue = (p: number | null | undefined): string => {
    if (p === null || p === undefined) return "-";
    if (p < 0.001) return "< 0.001";
    return p.toFixed(6);
  };

  return (
    <div className="space-y-6" id="regression-results">
      {/* =====================================================
          헤더: 리포트 작성기관
          ===================================================== */}
      <div className="text-center py-4 border-b border-slate-700">
        <p className="text-slate-400 text-sm">📊 회귀분석 결과 리포트</p>
        <p className="text-slate-500 text-xs mt-1">리포트 작성기관: 중간계 AI 연구소</p>
      </div>

      {/* =====================================================
          1. 회귀식
          ===================================================== */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-cyan-400 mb-4">📐 회귀식</h3>
        <div className="bg-slate-900 rounded-lg p-4 font-mono text-white text-sm overflow-x-auto">
          {results.regression_equation}
        </div>
      </div>

      {/* =====================================================
          2. 주요 변수 산점도 그래프
          ===================================================== */}
      {results.scatter_data && Object.keys(results.scatter_data).length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-cyan-400 mb-2">📊 변수별 영향력 시각화</h3>
          <p className="text-slate-500 text-xs mb-4">
            각 독립변수(X)가 종속변수(Y: {results.dependent_variable})에 미치는 영향을 산점도로 시각화합니다. 
            점들이 우상향하면 양(+)의 관계, 우하향하면 음(-)의 관계를 나타냅니다.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(results.scatter_data).slice(0, 6).map(([varName, data]) => {
              // 해당 변수의 계수 정보 찾기
              const coefInfo = results.coefficients.find(c => c.variable === varName);
              const isPositive = coefInfo && coefInfo.b > 0;
              const isSignificant = coefInfo && coefInfo.p_value < 0.05;
              
              // 차트 색상 결정
              const chartColor = isSignificant 
                ? (isPositive ? "#10b981" : "#ef4444") 
                : "#64748b";
              
              return (
                <div key={varName} className="bg-slate-900/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-white">{varName}</h4>
                    {isSignificant && (
                      <span className={`text-xs px-2 py-1 rounded ${isPositive ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'}`}>
                        {isPositive ? '📈 양의 관계' : '📉 음의 관계'}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs mb-3">
                    {varName}이(가) 증가하면 {results.dependent_variable}이(가) {isPositive ? '증가' : '감소'}합니다
                    {isSignificant ? ' (유의함)' : ' (유의하지 않음)'}
                  </p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="x" 
                          type="number" 
                          name={varName}
                          tick={{ fill: '#94a3b8', fontSize: 10 }}
                          tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value.toFixed(0)}
                          label={{ value: varName, position: 'bottom', fill: '#94a3b8', fontSize: 10, offset: 0 }}
                        />
                        <YAxis 
                          dataKey="y" 
                          type="number" 
                          name={results.dependent_variable}
                          tick={{ fill: '#94a3b8', fontSize: 10 }}
                          tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(0)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value.toFixed(0)}
                          width={45}
                        />
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3' }}
                          contentStyle={{ 
                            backgroundColor: '#1e293b', 
                            border: '1px solid #475569',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                          formatter={(value: number, name: string) => [
                            value.toLocaleString('ko-KR'),
                            name === 'x' ? varName : results.dependent_variable
                          ]}
                        />
                        <Scatter 
                          data={data} 
                          fill={chartColor}
                          fillOpacity={0.7}
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  {coefInfo && (
                    <div className="mt-2 text-xs text-slate-400">
                      계수: <span className={isPositive ? 'text-emerald-400' : 'text-red-400'}>{coefInfo.b.toFixed(4)}</span>
                      {' | '}
                      p-value: <span className={isSignificant ? 'text-emerald-400' : 'text-slate-400'}>{coefInfo.p_value < 0.001 ? '<0.001' : coefInfo.p_value.toFixed(4)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================
          3. 기술통계량 (Q1, Q3 포함)
          ===================================================== */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-cyan-400 mb-2">① 📋 기술통계량 표</h3>
        <p className="text-slate-500 text-xs mb-4">
          분석에 사용된 변수들의 기본 통계 정보입니다. 평균, 표준편차, 최솟값, 최댓값 등을 통해 데이터 분포를 확인할 수 있습니다.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-600">
                <th className="text-left py-2 px-3 text-slate-400">변수</th>
                <th className="text-center py-2 px-3 text-slate-400">N</th>
                <th className="text-center py-2 px-3 text-slate-400">평균</th>
                <th className="text-center py-2 px-3 text-slate-400">표준편차</th>
                <th className="text-center py-2 px-3 text-slate-400">최솟값</th>
                <th className="text-center py-2 px-3 text-slate-400">Q1 (25%)</th>
                <th className="text-center py-2 px-3 text-slate-400">중앙값</th>
                <th className="text-center py-2 px-3 text-slate-400">Q3 (75%)</th>
                <th className="text-center py-2 px-3 text-slate-400">최댓값</th>
              </tr>
            </thead>
            <tbody>
              {results.descriptive_stats.map((stat, idx) => (
                <tr key={idx} className="border-b border-slate-700/50">
                  <td className="py-3 px-3 text-white font-medium">{stat.variable}</td>
                  <td className="py-3 px-3 text-center text-white">{stat.n}</td>
                  <td className="py-3 px-3 text-center text-cyan-400">{formatLargeNumber(stat.mean, 4)}</td>
                  <td className="py-3 px-3 text-center text-white">{formatLargeNumber(stat.std, 4)}</td>
                  <td className="py-3 px-3 text-center text-white">{formatLargeNumber(stat.min, 4)}</td>
                  <td className="py-3 px-3 text-center text-white">{formatLargeNumber(stat.q25, 4)}</td>
                  <td className="py-3 px-3 text-center text-white">{formatLargeNumber(stat.median, 4)}</td>
                  <td className="py-3 px-3 text-center text-white">{formatLargeNumber(stat.q75, 4)}</td>
                  <td className="py-3 px-3 text-center text-white">{formatLargeNumber(stat.max, 4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================
          3. 상관관계 행렬
          ===================================================== */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-cyan-400 mb-2">② 🔗 상관관계 행렬 (Correlation Matrix)</h3>
        <p className="text-slate-500 text-xs mb-4">
          변수 간 선형 관계의 강도를 나타냅니다. -1에 가까우면 음의 상관, +1에 가까우면 양의 상관관계를 의미합니다.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="py-2 px-3 text-left text-slate-400">변수</th>
                {results.correlation_matrix.length > 0 && 
                  Object.keys(results.correlation_matrix[0])
                    .filter(k => k !== 'variable')
                    .map((col) => (
                      <th key={col} className="py-2 px-3 text-center text-slate-400 text-xs">{col}</th>
                    ))
                }
              </tr>
            </thead>
            <tbody>
              {results.correlation_matrix.map((row, idx) => (
                <tr key={idx} className="border-t border-slate-700/50">
                  <td className="py-2 px-3 text-white font-medium text-xs">{row.variable}</td>
                  {Object.keys(row)
                    .filter(k => k !== 'variable')
                    .map((col) => {
                      const value = row[col] ?? 0;
                      const isMain = row.variable === col;
                      const bgColor = isMain 
                        ? "bg-slate-700/50" 
                        : value >= 0.7 ? "bg-emerald-500/30"
                        : value >= 0.4 ? "bg-emerald-500/20"
                        : value <= -0.7 ? "bg-red-500/30"
                        : value <= -0.4 ? "bg-red-500/20"
                        : "";
                      
                      return (
                        <td key={col} className={`py-2 px-3 text-center text-white text-xs ${bgColor}`}>
                          {typeof value === 'number' ? value.toFixed(3) : value}
                        </td>
                      );
                    })
                  }
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================
          4. 모델 적합도 요약
          ===================================================== */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-cyan-400 mb-2">③ 📊 모델 적합도 요약 (Model Fit Summary)</h3>
        <p className="text-slate-500 text-xs mb-4">
          회귀모델이 데이터를 얼마나 잘 설명하는지 보여주는 주요 지표입니다.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/50 rounded-lg p-4 text-center">
            <p className="text-slate-400 text-xs">R² (결정계수)</p>
            <p className="text-2xl font-bold text-cyan-400">{formatNumber(results.model_summary.r_squared)}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4 text-center">
            <p className="text-slate-400 text-xs">Adjusted R²</p>
            <p className="text-2xl font-bold text-white">{formatNumber(results.model_summary.adj_r_squared)}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4 text-center">
            <p className="text-slate-400 text-xs">F-statistic</p>
            <p className="text-2xl font-bold text-white">{formatNumber(results.model_summary.f_statistic)}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4 text-center">
            <p className="text-slate-400 text-xs">F-statistic p-value</p>
            <p className={`text-2xl font-bold ${results.model_summary.f_pvalue < 0.05 ? 'text-emerald-400' : 'text-white'}`}>
              {formatPValue(results.model_summary.f_pvalue)}
            </p>
          </div>
        </div>
        <div className="mt-4 text-slate-500 text-xs">
          관측치 수: {results.n_observations}
        </div>
      </div>

      {/* =====================================================
          5. ANOVA 테이블
          ===================================================== */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-cyan-400 mb-2">④ 📈 ANOVA 표 (Analysis of Variance) ✅ 필수</h3>
        <p className="text-slate-500 text-xs mb-4">
          회귀모델의 전체적인 통계적 유의성을 검증합니다. F-통계량과 p-value를 통해 모델의 설명력을 판단합니다.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-600">
                <th className="text-left py-2 px-3 text-slate-400">변동 요인</th>
                <th className="text-right py-2 px-3 text-slate-400">제곱합 (SS)</th>
                <th className="text-center py-2 px-3 text-slate-400">자유도 (df)</th>
                <th className="text-right py-2 px-3 text-slate-400">평균제곱 (MS)</th>
                <th className="text-right py-2 px-3 text-slate-400">F-통계량</th>
                <th className="text-right py-2 px-3 text-slate-400">p-value</th>
              </tr>
            </thead>
            <tbody>
              {results.anova_table.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-700/50">
                  <td className="py-3 px-3 text-white">{row.source}</td>
                  <td className="py-3 px-3 text-right text-white">{formatLargeNumber(row.ss)}</td>
                  <td className="py-3 px-3 text-center text-white">{row.df}</td>
                  <td className="py-3 px-3 text-right text-white">{row.ms ? formatLargeNumber(row.ms) : "-"}</td>
                  <td className="py-3 px-3 text-right text-cyan-400 font-bold">
                    {row.f ? formatNumber(row.f) : "-"}
                  </td>
                  <td className={`py-3 px-3 text-right font-bold ${row.p_value && row.p_value < 0.05 ? "text-emerald-400" : "text-white"}`}>
                    {row.p_value ? formatPValue(row.p_value) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================
          6. 회귀계수 표
          ===================================================== */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-cyan-400 mb-2">⑤ 📈 회귀계수 표 (Regression Coefficients) ✅ 필수</h3>
        <p className="text-slate-500 text-xs mb-4">
          각 독립변수가 종속변수에 미치는 영향력의 크기와 통계적 유의성을 나타냅니다.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-600">
                <th className="text-left py-2 px-3 text-slate-400">변수</th>
                <th className="text-center py-2 px-3 text-slate-400">계수</th>
                <th className="text-center py-2 px-3 text-slate-400">표준화 계수</th>
                <th className="text-center py-2 px-3 text-slate-400">표준오차</th>
                <th className="text-center py-2 px-3 text-slate-400">t-value</th>
                <th className="text-center py-2 px-3 text-slate-400">p-value</th>
                <th className="text-center py-2 px-3 text-slate-400">VIF</th>
              </tr>
            </thead>
            <tbody>
              {results.coefficients.map((coef, idx) => {
                const isSignificant = coef.p_value < 0.05;
                const highVIF = coef.vif !== null && coef.vif > 10;
                const isInteraction = coef.var_type === 'interaction';
                
                return (
                  <tr key={idx} className={`border-b border-slate-700/50 ${isSignificant ? "bg-emerald-900/10" : ""}`}>
                    <td className="py-3 px-3 text-white font-medium">
                      {isInteraction && <span className="text-purple-400 mr-1">🔗</span>}
                      {coef.variable}
                    </td>
                    <td className="py-3 px-3 text-center text-cyan-400 font-bold">{formatNumber(coef.b, 6)}</td>
                    <td className="py-3 px-3 text-center text-white">
                      {coef.beta !== null ? formatNumber(coef.beta, 6) : "-"}
                    </td>
                    <td className="py-3 px-3 text-center text-white">{formatNumber(coef.std_error, 6)}</td>
                    <td className="py-3 px-3 text-center text-white">{formatNumber(coef.t_statistic, 4)}</td>
                    <td className={`py-3 px-3 text-center font-medium ${isSignificant ? "text-emerald-400" : "text-white"}`}>
                      {formatPValue(coef.p_value)}
                      {isSignificant && " *"}
                    </td>
                    <td className={`py-3 px-3 text-center ${highVIF ? "text-red-400 font-bold" : "text-white"}`}>
                      {coef.vif !== null ? formatNumber(coef.vif, 2) : "-"}
                      {highVIF && " ⚠️"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-slate-500 text-xs">
          * p &lt; 0.05 (통계적으로 유의) | 🔗 상호작용 항 | VIF &gt; 10: 다중공선성 주의
        </p>
      </div>

      {/* =====================================================
          7. 잔차 진단 (Jarque-Bera, 이상치 분석)
          ===================================================== */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-cyan-400 mb-2">⑥ 🔍 잔차 진단 (Residual Diagnostics) 🎯 고급</h3>
        <p className="text-slate-500 text-xs mb-4">
          회귀모델의 가정 충족 여부를 검증합니다. 정규성, 등분산성, 독립성을 확인하여 모델의 신뢰성을 평가합니다.
        </p>
        
        {/* 잔차 통계 요약 */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-300 mb-3">📊 잔차 통계 요약</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-slate-900/50 rounded-lg p-3">
              <p className="text-slate-400 text-xs">평균 (Mean)</p>
              <p className="text-white font-mono">{formatNumber(results.residual_stats.mean, 6)}</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <p className="text-slate-400 text-xs">표준편차 (Std Dev)</p>
              <p className="text-white font-mono">{formatLargeNumber(results.residual_stats.std, 4)}</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <p className="text-slate-400 text-xs">최솟값 (Min)</p>
              <p className="text-white font-mono">{formatLargeNumber(results.residual_stats.min, 4)}</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <p className="text-slate-400 text-xs">최댓값 (Max)</p>
              <p className="text-white font-mono">{formatLargeNumber(results.residual_stats.max, 4)}</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <p className="text-slate-400 text-xs">왜도 (Skewness)</p>
              <p className="text-white font-mono">{formatNumber(results.residual_stats.skewness, 4)}</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <p className="text-slate-400 text-xs">첨도 (Kurtosis)</p>
              <p className="text-white font-mono">{formatNumber(results.residual_stats.kurtosis, 4)}</p>
            </div>
          </div>
        </div>
        
        {/* 진단 검정 결과 */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-300 mb-3">🧪 진단 검정 결과</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-600">
                  <th className="text-left py-2 px-3 text-slate-400">검정</th>
                  <th className="text-center py-2 px-3 text-slate-400">통계량</th>
                  <th className="text-center py-2 px-3 text-slate-400">p-value</th>
                  <th className="text-left py-2 px-3 text-slate-400">해석</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-700/50">
                  <td className="py-3 px-3 text-white">Jarque-Bera 정규성 검정</td>
                  <td className="py-3 px-3 text-center text-white">{formatNumber(results.residual_stats.jarque_bera_stat, 4)}</td>
                  <td className="py-3 px-3 text-center text-white">{formatNumber(results.residual_stats.jarque_bera_pvalue, 6)}</td>
                  <td className={`py-3 px-3 ${results.residual_stats.jarque_bera_pvalue > 0.05 ? "text-emerald-400" : "text-yellow-400"}`}>
                    {results.residual_stats.jarque_bera_pvalue > 0.05 
                      ? "✅ 잔차가 정규분포를 따릅니다 (p > 0.05)"
                      : "⚠️ 잔차가 정규분포를 따르지 않습니다 (p ≤ 0.05)"
                    }
                  </td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="py-3 px-3 text-white">Durbin-Watson 자기상관 검정</td>
                  <td className="py-3 px-3 text-center text-white">{formatNumber(results.residual_stats.durbin_watson, 4)}</td>
                  <td className="py-3 px-3 text-center text-slate-500">-</td>
                  <td className={`py-3 px-3 ${results.residual_stats.durbin_watson >= 1.5 && results.residual_stats.durbin_watson <= 2.5 ? "text-emerald-400" : "text-yellow-400"}`}>
                    {results.residual_stats.durbin_watson >= 1.5 && results.residual_stats.durbin_watson <= 2.5
                      ? "✅ 자기상관 문제 없음 (1.5 ≤ DW ≤ 2.5)"
                      : "⚠️ 자기상관 문제 가능성 있음"
                    }
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        {/* 이상치 분석 */}
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-3">⚠️ 이상치 분석</h4>
          <div className={`p-4 rounded-lg ${results.residual_stats.outliers_count > 0 ? "bg-yellow-900/20 border border-yellow-700/50" : "bg-emerald-900/20 border border-emerald-700/50"}`}>
            <p className={`${results.residual_stats.outliers_count > 0 ? "text-yellow-400" : "text-emerald-400"}`}>
              이상치 개수: {results.residual_stats.outliers_count}개 ({results.residual_stats.outliers_percent}%)
            </p>
            <p className="text-slate-500 text-xs mt-1">
              💡 표준화 잔차의 절댓값이 3을 초과하는 관측치를 이상치로 판정합니다.
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================
          8. 제거된 변수
          ===================================================== */}
      {results.removed_vars && results.removed_vars.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-yellow-400 mb-4">⚠️ 제거된 변수</h3>
          <div className="flex flex-wrap gap-2">
            {results.removed_vars.map((v, idx) => (
              <span key={idx} className="px-3 py-1 bg-yellow-900/30 text-yellow-400 rounded-full text-sm">
                {v}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================
          9. 결과 해석
          ===================================================== */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-cyan-400 mb-4">💡 결과 해석</h3>
        <p className="text-slate-300 leading-relaxed">{results.interpretation}</p>
      </div>

      {/* =====================================================
          10. 실측치/예측치 (접기)
          ===================================================== */}
      <details className="bg-slate-800/50 border border-slate-700 rounded-xl" open>
        <summary className="p-6 cursor-pointer text-lg font-bold text-cyan-400 hover:bg-slate-700/30">
          📉 실측치 vs 예측치 (상위 {Math.min(20, results.actual_vs_predicted.length)}개)
        </summary>
        <div className="px-6 pb-6">
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-800">
                <tr className="border-b border-slate-600">
                  <th className="text-center py-2 px-3 text-slate-400">#</th>
                  <th className="text-right py-2 px-3 text-slate-400">실측치 (Y)</th>
                  <th className="text-right py-2 px-3 text-slate-400">예측치 (Ŷ)</th>
                  <th className="text-right py-2 px-3 text-slate-400">잔차 (e)</th>
                </tr>
              </thead>
              <tbody>
                {results.actual_vs_predicted.slice(0, 20).map((row) => (
                  <tr key={row.index} className="border-b border-slate-700/50">
                    <td className="py-2 px-3 text-center text-slate-500">{row.index}</td>
                    <td className="py-2 px-3 text-right text-white">{formatLargeNumber(row.actual, 2)}</td>
                    <td className="py-2 px-3 text-right text-cyan-400">{formatLargeNumber(row.predicted, 2)}</td>
                    <td className={`py-2 px-3 text-right ${row.residual > 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatLargeNumber(row.residual, 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {results.actual_vs_predicted.length > 20 && (
            <p className="mt-2 text-slate-500 text-xs text-center">
              ... 외 {results.actual_vs_predicted.length - 20}개 행
            </p>
          )}
          
          {/* 실측치 vs 예측치 그래프 */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <h4 className="text-sm font-semibold text-slate-300 mb-4">📈 실측치 vs 예측치 비교 그래프</h4>
            
            {/* 선 그래프: 실측치와 예측치 비교 */}
            <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
              <p className="text-slate-500 text-xs mb-3">실측치(흰색)와 예측치(파란색)의 변화 추이</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={results.actual_vs_predicted.slice(0, 50)} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="index" 
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      label={{ value: '관측치 번호', position: 'bottom', fill: '#94a3b8', fontSize: 11, offset: -5 }}
                    />
                    <YAxis 
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(0)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value.toFixed(0)}
                      label={{ value: results.dependent_variable, angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: number, name: string) => [
                        value.toLocaleString('ko-KR'),
                        name === 'actual' ? '실측치' : '예측치'
                      ]}
                      labelFormatter={(label) => `관측치 #${label}`}
                    />
                    <Legend 
                      formatter={(value) => value === 'actual' ? '실측치 (Y)' : '예측치 (Ŷ)'}
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="actual" 
                      stroke="#ffffff" 
                      strokeWidth={2}
                      dot={{ fill: '#ffffff', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="predicted" 
                      stroke="#06b6d4" 
                      strokeWidth={2}
                      dot={{ fill: '#06b6d4', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* 산점도: 실측치 vs 예측치 (45도선 기준) */}
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-slate-500 text-xs mb-3">실측치(X축) vs 예측치(Y축) 산점도 - 대각선에 가까울수록 예측 정확도가 높음</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="actual" 
                      type="number"
                      name="실측치"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(0)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value.toFixed(0)}
                      label={{ value: '실측치 (Y)', position: 'bottom', fill: '#94a3b8', fontSize: 11, offset: 0 }}
                    />
                    <YAxis 
                      dataKey="predicted" 
                      type="number"
                      name="예측치"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(0)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value.toFixed(0)}
                      label={{ value: '예측치 (Ŷ)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
                    />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: number, name: string) => [
                        value.toLocaleString('ko-KR'),
                        name === 'actual' ? '실측치' : '예측치'
                      ]}
                    />
                    <ReferenceLine 
                      segment={[
                        { x: Math.min(...results.actual_vs_predicted.map(d => d.actual)), y: Math.min(...results.actual_vs_predicted.map(d => d.actual)) },
                        { x: Math.max(...results.actual_vs_predicted.map(d => d.actual)), y: Math.max(...results.actual_vs_predicted.map(d => d.actual)) }
                      ]}
                      stroke="#fbbf24" 
                      strokeDasharray="5 5"
                      strokeWidth={2}
                    />
                    <Scatter 
                      data={results.actual_vs_predicted} 
                      fill="#10b981"
                      fillOpacity={0.8}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <p className="text-slate-500 text-xs mt-2 text-center">
                💡 노란 점선은 완벽한 예측선(Y=Ŷ)입니다. 점들이 이 선에 가까울수록 예측이 정확합니다.
              </p>
            </div>
          </div>
        </div>
      </details>

      {/* =====================================================
          하단 버튼
          ===================================================== */}
      <div className="flex flex-wrap gap-4 justify-center mt-8 pt-6 border-t border-slate-700">
        <button
          onClick={onCopyResults}
          className="px-8 py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold text-white transition-all flex items-center gap-2"
        >
          📋 통계결과 복사하기
        </button>
        <button
          onClick={onRequestInterpretation}
          className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 rounded-xl font-semibold text-white transition-all shadow-lg shadow-purple-500/25 flex items-center gap-2"
        >
          🤖 AI 결과해석
        </button>
      </div>
      
      {/* 푸터 */}
      <div className="text-center py-4 border-t border-slate-700 mt-4">
        <p className="text-slate-500 text-xs">리포트 작성기관: 중간계 AI 연구소</p>
      </div>
    </div>
  );
}

/**
 * 결과를 텍스트로 변환 (복사용)
 */
export function resultsToText(results: RegressionResult, companyName: string): string {
  let text = "";
  
  text += `${"=".repeat(80)}\n\n`;
  text += `📊 회귀분석 통계 결과\n\n`;
  text += `${"=".repeat(80)}\n\n`;
  text += `📊 회귀분석 결과 리포트\n\n`;
  text += `리포트 작성기관: 중간계 AI 연구소\n\n`;
  
  // 회귀식
  text += `📐 회귀식\n\n`;
  text += `${results.regression_equation}\n\n`;
  
  // 기술통계량
  text += `① 📋 기술통계량 표\n\n`;
  text += `분석에 사용된 변수들의 기본 통계 정보입니다. 평균, 표준편차, 최솟값, 최댓값 등을 통해 데이터 분포를 확인할 수 있습니다.\n\n`;
  text += `변수\tN\t평균\t표준편차\t최솟값\tQ1 (25%)\t중앙값\tQ3 (75%)\t최댓값\n\n`;
  results.descriptive_stats.forEach(s => {
    text += `${s.variable}\t${s.n}\t${s.mean.toFixed(4)}\t${s.std.toFixed(4)}\t${s.min.toFixed(4)}\t${s.q25.toFixed(4)}\t${s.median.toFixed(4)}\t${s.q75.toFixed(4)}\t${s.max.toFixed(4)}\n`;
  });
  text += `\n`;
  
  // 상관관계
  text += `② 🔗 상관관계 행렬 (Correlation Matrix)\n\n`;
  text += `변수 간 선형 관계의 강도를 나타냅니다. -1에 가까우면 음의 상관, +1에 가까우면 양의 상관관계를 의미합니다.\n\n`;
  
  // 모델 요약
  text += `③ 📊 모델 적합도 요약 (Model Fit Summary)\n\n`;
  text += `회귀모델이 데이터를 얼마나 잘 설명하는지 보여주는 주요 지표입니다.\n\n`;
  text += `R² (결정계수)\t${results.model_summary.r_squared.toFixed(4)}\n`;
  text += `Adjusted R²\t${results.model_summary.adj_r_squared.toFixed(4)}\n`;
  text += `F-statistic\t${results.model_summary.f_statistic.toFixed(4)}\n`;
  text += `F-statistic p-value\t${results.model_summary.f_pvalue < 0.001 ? '< 0.001' : results.model_summary.f_pvalue.toFixed(6)}\n`;
  text += `관측치 수\t${results.n_observations}\n\n`;
  
  // ANOVA
  text += `④ 📈 ANOVA 표 (Analysis of Variance) ✅ 필수\n\n`;
  text += `회귀모델의 전체적인 통계적 유의성을 검증합니다. F-통계량과 p-value를 통해 모델의 설명력을 판단합니다.\n\n`;
  text += `변동 요인\t제곱합 (SS)\t자유도 (df)\t평균제곱 (MS)\tF-통계량\tp-value\n\n`;
  results.anova_table.forEach(row => {
    text += `${row.source}\t${row.ss.toFixed(4)}\t${row.df}\t${row.ms ? row.ms.toFixed(4) : '-'}\t${row.f ? row.f.toFixed(4) : '-'}\t${row.p_value ? (row.p_value < 0.001 ? '< 0.001' : row.p_value.toFixed(6)) : '-'}\n`;
  });
  text += `\n`;
  
  // 계수
  text += `⑤ 📈 회귀계수 표 (Regression Coefficients) ✅ 필수\n\n`;
  text += `각 독립변수가 종속변수에 미치는 영향력의 크기와 통계적 유의성을 나타냅니다.\n\n`;
  text += `변수\t계수\t표준화 계수\t표준오차\tt-value\tp-value\tVIF\n\n`;
  results.coefficients.forEach(c => {
    const prefix = c.var_type === 'interaction' ? '🔗 ' : '';
    text += `${prefix}${c.variable}\t${c.b.toFixed(6)}\t${c.beta !== null ? c.beta.toFixed(6) : '-'}\t${c.std_error.toFixed(6)}\t${c.t_statistic.toFixed(4)}\t${c.p_value < 0.001 ? '< 0.001' : c.p_value.toFixed(6)}\t${c.vif !== null ? c.vif.toFixed(2) : '-'}\n`;
  });
  text += `\n`;
  
  // 잔차 진단
  text += `⑥ 🔍 잔차 진단 (Residual Diagnostics) 🎯 고급\n\n`;
  text += `회귀모델의 가정 충족 여부를 검증합니다. 정규성, 등분산성, 독립성을 확인하여 모델의 신뢰성을 평가합니다.\n\n`;
  text += `📊 잔차 통계 요약\n\n`;
  text += `평균 (Mean)\t${results.residual_stats.mean.toFixed(6)}\n`;
  text += `표준편차 (Std Dev)\t${results.residual_stats.std.toFixed(4)}\n`;
  text += `최솟값 (Min)\t${results.residual_stats.min.toFixed(4)}\n`;
  text += `최댓값 (Max)\t${results.residual_stats.max.toFixed(4)}\n`;
  text += `왜도 (Skewness)\t${results.residual_stats.skewness.toFixed(4)}\n`;
  text += `첨도 (Kurtosis)\t${results.residual_stats.kurtosis.toFixed(4)}\n\n`;
  
  text += `🧪 진단 검정 결과\n\n`;
  text += `검정\t통계량\tp-value\t해석\n\n`;
  text += `Jarque-Bera 정규성 검정\t${results.residual_stats.jarque_bera_stat.toFixed(4)}\t${results.residual_stats.jarque_bera_pvalue.toFixed(6)}\t${results.residual_stats.jarque_bera_pvalue > 0.05 ? '✅ 잔차가 정규분포를 따릅니다 (p > 0.05)' : '⚠️ 잔차가 정규분포를 따르지 않습니다 (p ≤ 0.05)'}\n`;
  text += `Durbin-Watson 자기상관 검정\t${results.residual_stats.durbin_watson.toFixed(4)}\t-\t${results.residual_stats.durbin_watson >= 1.5 && results.residual_stats.durbin_watson <= 2.5 ? '✅ 자기상관 문제 없음 (1.5 ≤ DW ≤ 2.5)' : '⚠️ 자기상관 문제 가능성 있음'}\n\n`;
  
  text += `⚠️ 이상치 분석\n\n`;
  text += `이상치 개수: ${results.residual_stats.outliers_count}개 (${results.residual_stats.outliers_percent}%)\n\n`;
  text += `💡 표준화 잔차의 절댓값이 3을 초과하는 관측치를 이상치로 판정합니다.\n\n`;
  
  // 제거된 변수
  if (results.removed_vars && results.removed_vars.length > 0) {
    text += `⚠️ 제거된 변수\n\n`;
    text += `${results.removed_vars.join(', ')}\n\n`;
  }
  
  // 해석
  text += `💡 결과 해석\n\n`;
  text += `${results.interpretation}\n\n`;
  
  text += `📋 통계결과 복사하기\n\n`;
  text += `회귀분석 결과(6가지 통계표 포함)를 클립보드에 복사합니다\n\n`;
  
  text += `${"=".repeat(80)}\n\n`;
  text += `리포트 작성기관: 중간계 AI 연구소\n\n`;
  text += `${"=".repeat(80)}\n`;
  
  return text;
}
