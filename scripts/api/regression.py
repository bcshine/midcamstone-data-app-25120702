# =====================================================
# 회귀분석 로직 모듈 (업그레이드 버전)
# statsmodels를 사용한 다중회귀분석 구현
# SPSS 스타일 결과 출력 지원
# 
# 주요 기능:
# - 2-way 상호작용 효과 자동 생성
# - VIF > 10 변수 자동 제거 (다중공선성 해결)
# - Jarque-Bera 정규성 검정
# - 이상치 분석 (표준화 잔차 > 3)
# - 사분위수 (Q1, Q3) 포함
# - 제거된 변수 상세 표시
# =====================================================

import numpy as np
import pandas as pd
import statsmodels.api as sm
from statsmodels.stats.outliers_influence import variance_inflation_factor
from statsmodels.stats.stattools import durbin_watson
from scipy import stats
from itertools import combinations
from typing import Dict, List, Any, Optional, Tuple
import warnings

warnings.filterwarnings('ignore')


def safe_float(value, default=0.0) -> float:
    """
    NaN, Inf를 안전하게 처리하는 float 변환 함수
    
    Args:
        value: 변환할 값
        default: 기본값
    
    Returns:
        안전하게 변환된 float 값
    """
    import math
    try:
        val = float(value)
        if math.isnan(val) or math.isinf(val):
            return default
        return val
    except (ValueError, TypeError):
        return default


def calculate_vif(df: pd.DataFrame, independent_vars: List[str]) -> Dict[str, float]:
    """
    VIF (Variance Inflation Factor) 계산
    다중공선성 진단에 사용
    
    Args:
        df: 데이터프레임
        independent_vars: 독립변수 목록
    
    Returns:
        변수별 VIF 딕셔너리
    """
    vif_data = {}
    
    if len(independent_vars) < 2:
        # 독립변수가 1개면 VIF = 1
        for var in independent_vars:
            vif_data[var] = 1.0
        return vif_data
    
    X = df[independent_vars].values
    
    for i, var in enumerate(independent_vars):
        try:
            vif = variance_inflation_factor(X, i)
            vif_data[var] = round(vif, 2) if not np.isinf(vif) else 999.99
        except:
            vif_data[var] = 999.99
    
    return vif_data


def remove_multicollinearity(df: pd.DataFrame, independent_vars: List[str], 
                            threshold: float = 10.0) -> Tuple[List[str], List[str]]:
    """
    VIF > threshold 변수를 반복적으로 제거하여 다중공선성 해결
    
    Args:
        df: 데이터프레임
        independent_vars: 독립변수 목록
        threshold: VIF 임계값 (기본 10)
    
    Returns:
        (남은 변수 목록, 제거된 변수 목록)
    """
    remaining_vars = independent_vars.copy()
    removed_vars = []
    
    while len(remaining_vars) > 1:
        vif_dict = calculate_vif(df, remaining_vars)
        max_vif = max(vif_dict.values())
        
        if max_vif <= threshold:
            break
        
        # VIF가 가장 높은 변수 제거
        max_var = max(vif_dict, key=vif_dict.get)
        remaining_vars.remove(max_var)
        removed_vars.append(f"{max_var} (VIF={vif_dict[max_var]:.2f})")
        print(f"  [다중공선성 제거] {max_var} (VIF={vif_dict[max_var]})")
    
    return remaining_vars, removed_vars


def calculate_descriptive_stats(df: pd.DataFrame, columns: List[str]) -> List[Dict[str, Any]]:
    """
    기술통계량 계산 (Q1, Q3 포함)
    
    Args:
        df: 데이터프레임
        columns: 분석할 컬럼 목록
    
    Returns:
        기술통계량 리스트
    """
    stats_list = []
    
    for col in columns:
        if col in df.columns:
            col_data = pd.to_numeric(df[col], errors='coerce').dropna()
            
            if len(col_data) > 0:
                stats_list.append({
                    "variable": col,
                    "n": int(len(col_data)),
                    "mean": float(round(col_data.mean(), 4)),
                    "std": float(round(col_data.std(), 4)),
                    "min": float(round(col_data.min(), 4)),
                    "q25": float(round(col_data.quantile(0.25), 4)),  # Q1 추가
                    "median": float(round(col_data.median(), 4)),
                    "q75": float(round(col_data.quantile(0.75), 4)),  # Q3 추가
                    "max": float(round(col_data.max(), 4)),
                    "skewness": float(round(col_data.skew(), 4)),
                    "kurtosis": float(round(col_data.kurtosis(), 4))
                })
    
    return stats_list


def calculate_correlation_matrix(df: pd.DataFrame, columns: List[str]) -> List[Dict[str, Any]]:
    """
    상관행렬 계산
    
    Args:
        df: 데이터프레임
        columns: 분석할 컬럼 목록
    
    Returns:
        상관행렬 리스트
    """
    # 숫자형으로 변환
    numeric_df = df[columns].apply(pd.to_numeric, errors='coerce').dropna()
    
    if len(numeric_df) < 3:
        return []
    
    # 피어슨 상관계수
    corr_matrix = numeric_df.corr()
    
    # 리스트 형태로 변환
    correlation_list = []
    for i, var1 in enumerate(columns):
        row = {"variable": var1}
        for var2 in columns:
            if var1 in corr_matrix.index and var2 in corr_matrix.columns:
                row[var2] = round(float(corr_matrix.loc[var1, var2]), 4)
            else:
                row[var2] = 0.0
        correlation_list.append(row)
    
    return correlation_list


def run_regression(data: List[Dict], 
                   dependent_var: str, 
                   independent_vars: List[str],
                   method: str = "enter") -> Dict[str, Any]:
    """
    다중회귀분석 실행 (superbase_link 스타일 업그레이드)
    
    주요 기능:
    - 2-way 상호작용 효과 자동 생성
    - VIF > 10 변수 자동 제거
    - Jarque-Bera 정규성 검정
    - 이상치 분석
    - 사분위수 포함
    
    Args:
        data: 데이터 목록 (딕셔너리 리스트)
        dependent_var: 종속변수명
        independent_vars: 독립변수 목록
        method: "enter" 또는 "stepwise"
    
    Returns:
        회귀분석 결과 딕셔너리
    """
    try:
        # 데이터프레임 생성
        df = pd.DataFrame(data)
        
        # 분석에 필요한 컬럼만 추출
        all_vars = [dependent_var] + independent_vars
        analysis_df = df[all_vars].copy()
        
        # 숫자형으로 변환
        for col in all_vars:
            analysis_df[col] = pd.to_numeric(analysis_df[col], errors='coerce')
        
        # 결측치 제거
        analysis_df = analysis_df.dropna()
        initial_count = len(analysis_df)
        
        if initial_count < len(independent_vars) + 2:
            return {"error": "데이터가 충분하지 않습니다. 최소 (독립변수 수 + 2)개의 행이 필요합니다."}
        
        # =====================================================
        # 1단계: 다중공선성 제거 (VIF > 10)
        # =====================================================
        print(f"\n=== {method.upper()} 방식 회귀분석 ===")
        print(f"종속변수: {dependent_var}")
        print(f"독립변수: {independent_vars}")
        
        final_main_vars, removed_by_vif = remove_multicollinearity(
            analysis_df, independent_vars, threshold=10
        )
        
        if len(final_main_vars) == 0:
            return {"error": "모든 독립변수가 다중공선성으로 제거되었습니다."}
        
        # =====================================================
        # 2단계: 2-way 상호작용 항 생성
        # =====================================================
        interaction_terms = []
        if len(final_main_vars) >= 2:
            for var1, var2 in combinations(final_main_vars, 2):
                interaction_name = f"{var1}×{var2}"
                analysis_df[interaction_name] = analysis_df[var1] * analysis_df[var2]
                interaction_terms.append(interaction_name)
            print(f"생성된 상호작용 항: {len(interaction_terms)}개")
        
        # 주효과 + 상호작용 항
        all_analysis_vars = final_main_vars + interaction_terms
        
        # =====================================================
        # 3단계: Stepwise 변수 선택 (method가 stepwise인 경우)
        # =====================================================
        removed_by_pvalue = []
        
        if method == "stepwise":
            current_vars = all_analysis_vars.copy()
            p_threshold = 0.05
            
            # Backward Elimination
            while len(current_vars) > 0:
                X = sm.add_constant(analysis_df[current_vars])
                y = analysis_df[dependent_var]
                model = sm.OLS(y, X).fit()
                
                # p-value가 가장 높은 변수 찾기 (상수항 제외)
                pvalues = model.pvalues.drop('const')
                max_pvalue = pvalues.max()
                
                if max_pvalue > p_threshold:
                    var_to_remove = pvalues.idxmax()
                    current_vars.remove(var_to_remove)
                    removed_by_pvalue.append(f"{var_to_remove} (p={max_pvalue:.4f})")
                    print(f"  [p-value 제거] {var_to_remove} (p={max_pvalue:.4f})")
                else:
                    break
            
            if len(current_vars) == 0:
                return {"error": "모든 독립변수가 제거되었습니다. (p-value > 0.05)"}
            
            all_analysis_vars = current_vars
            # 최종 주효과 변수 업데이트
            final_main_vars = [v for v in all_analysis_vars if v in final_main_vars]
            interaction_terms = [v for v in all_analysis_vars if v in interaction_terms]
        
        # =====================================================
        # 4단계: 최종 회귀분석 실행
        # =====================================================
        X = analysis_df[all_analysis_vars]
        y = analysis_df[dependent_var]
        X_with_const = sm.add_constant(X)
        
        model = sm.OLS(y, X_with_const).fit()
        
        # 예측값 및 잔차
        y_pred = model.predict(X_with_const)
        residuals = y - y_pred
        
        # =====================================================
        # 기술통계량 계산 (Q1, Q3 포함)
        # =====================================================
        descriptive_vars = [dependent_var] + final_main_vars
        descriptive_stats = calculate_descriptive_stats(analysis_df, descriptive_vars)
        
        # =====================================================
        # 상관관계 행렬
        # =====================================================
        correlation_matrix = calculate_correlation_matrix(analysis_df, descriptive_vars)
        
        # =====================================================
        # ANOVA 표 계산
        # =====================================================
        n = len(y)
        k = len(all_analysis_vars)
        
        y_mean = y.mean()
        sst = float(np.sum((y - y_mean) ** 2))
        ssr = float(np.sum((y_pred - y_mean) ** 2))
        sse = float(np.sum(residuals ** 2))
        
        df_regression = k
        df_residual = n - k - 1
        df_total = n - 1
        
        msr = ssr / df_regression if df_regression > 0 else 0
        mse = sse / df_residual if df_residual > 0 else 0
        
        anova_table = [
            {
                "source": "회귀(Regression)",
                "ss": round(safe_float(ssr), 4),
                "df": int(df_regression),
                "ms": round(safe_float(msr), 4),
                "f": round(safe_float(model.fvalue), 4),
                "p_value": round(safe_float(model.f_pvalue), 6)
            },
            {
                "source": "잔차(Residual)",
                "ss": round(safe_float(sse), 4),
                "df": int(df_residual),
                "ms": round(safe_float(mse), 4),
                "f": None,
                "p_value": None
            },
            {
                "source": "전체(Total)",
                "ss": round(safe_float(sst), 4),
                "df": int(df_total),
                "ms": None,
                "f": None,
                "p_value": None
            }
        ]
        
        # =====================================================
        # 잔차 진단 (Jarque-Bera, 이상치 분석 추가)
        # =====================================================
        standardized_residuals = residuals / np.std(residuals)
        
        # Jarque-Bera 정규성 검정
        jb_stat, jb_pvalue = stats.jarque_bera(residuals)
        
        # Durbin-Watson 자기상관 검정
        dw_stat = float(durbin_watson(residuals))
        
        # 이상치 분석 (표준화 잔차 절댓값 > 3)
        outliers_count = int(np.sum(np.abs(standardized_residuals) > 3))
        outliers_percent = round(outliers_count / len(residuals) * 100, 2)
        
        residual_stats = {
            "mean": round(safe_float(residuals.mean()), 6),
            "std": round(safe_float(residuals.std()), 4),
            "min": round(safe_float(residuals.min()), 4),
            "max": round(safe_float(residuals.max()), 4),
            "skewness": round(safe_float(residuals.skew()), 4),
            "kurtosis": round(safe_float(residuals.kurtosis()), 4),
            "durbin_watson": round(dw_stat, 4),
            "jarque_bera_stat": round(safe_float(jb_stat), 4),
            "jarque_bera_pvalue": round(safe_float(jb_pvalue), 6),
            "outliers_count": outliers_count,
            "outliers_percent": outliers_percent
        }
        
        # =====================================================
        # VIF 계산 (주효과만)
        # =====================================================
        vif_dict = calculate_vif(analysis_df, final_main_vars) if final_main_vars else {}
        
        # =====================================================
        # 계수 정보 (표준화 계수 포함)
        # =====================================================
        std_y = y.std()
        coefficients = []
        
        # 상수항
        coefficients.append({
            "variable": "상수항",
            "b": round(safe_float(model.params['const']), 6),
            "std_error": round(safe_float(model.bse['const']), 6),
            "beta": None,  # 상수항은 표준화 계수 없음
            "t_statistic": round(safe_float(model.tvalues['const']), 4),
            "p_value": round(safe_float(model.pvalues['const']), 6),
            "tolerance": None,
            "vif": None,
            "var_type": "constant"
        })
        
        # 주효과
        for var in final_main_vars:
            std_x = analysis_df[var].std()
            beta = model.params[var] * (std_x / std_y) if std_y != 0 else 0
            
            vif_value = vif_dict.get(var)
            tolerance = round(1.0 / vif_value, 4) if vif_value and vif_value > 0 else None
            
            coefficients.append({
                "variable": var,
                "b": round(safe_float(model.params[var]), 6),
                "std_error": round(safe_float(model.bse[var]), 6),
                "beta": round(safe_float(beta), 6),
                "t_statistic": round(safe_float(model.tvalues[var]), 4),
                "p_value": round(safe_float(model.pvalues[var]), 6),
                "tolerance": tolerance,
                "vif": round(safe_float(vif_value), 2) if vif_value else None,
                "var_type": "main"
            })
        
        # 상호작용 항
        for var in interaction_terms:
            std_x = analysis_df[var].std()
            beta = model.params[var] * (std_x / std_y) if std_y != 0 else 0
            
            coefficients.append({
                "variable": var,
                "b": round(safe_float(model.params[var]), 6),
                "std_error": round(safe_float(model.bse[var]), 6),
                "beta": round(safe_float(beta), 6),
                "t_statistic": round(safe_float(model.tvalues[var]), 4),
                "p_value": round(safe_float(model.pvalues[var]), 6),
                "tolerance": None,  # 상호작용 항은 VIF 계산 제외
                "vif": None,
                "var_type": "interaction"
            })
        
        # =====================================================
        # 회귀식 생성
        # =====================================================
        equation_parts = [f"{round(model.params['const'], 4)} × 상수항"]
        for var in all_analysis_vars:
            coef = model.params[var]
            sign = "+" if coef >= 0 else "-"
            equation_parts.append(f"{sign} {abs(round(coef, 4))} × {var}")
        
        regression_equation = f"Y = " + " ".join(equation_parts)
        
        # =====================================================
        # 실측치/예측치 (첫 50개)
        # =====================================================
        actual_vs_predicted = [
            {
                "index": i + 1,
                "actual": round(safe_float(actual), 4),
                "predicted": round(safe_float(pred), 4),
                "residual": round(safe_float(res), 4)
            }
            for i, (actual, pred, res) in enumerate(zip(y.values[:50], y_pred.values[:50], residuals.values[:50]))
        ]
        
        # =====================================================
        # 산점도 데이터 (주요 변수별 X-Y 관계)
        # =====================================================
        scatter_data = {}
        for var in final_main_vars:
            scatter_data[var] = [
                {
                    "x": round(safe_float(x_val), 4),
                    "y": round(safe_float(y_val), 4)
                }
                for x_val, y_val in zip(analysis_df[var].values, y.values)
            ]
        
        # =====================================================
        # 제거된 변수 목록
        # =====================================================
        all_removed_vars = removed_by_vif + removed_by_pvalue
        
        # =====================================================
        # 결과 해석 생성
        # =====================================================
        interpretation = generate_interpretation(
            model, coefficients, all_removed_vars, vif_dict,
            final_main_vars, interaction_terms, residual_stats
        )
        
        # =====================================================
        # 결과 반환
        # =====================================================
        r_multiple = float(np.sqrt(model.rsquared))
        
        result = {
            "success": True,
            "method": method,
            "n_observations": int(n),
            "dependent_variable": dependent_var,
            "independent_variables": all_analysis_vars,
            "final_main_vars": final_main_vars,
            "interaction_terms": interaction_terms,
            "removed_vars": all_removed_vars,
            
            # 회귀식
            "regression_equation": regression_equation,
            
            # 모델 요약
            "model_summary": {
                "r": round(r_multiple, 4),
                "r_squared": round(safe_float(model.rsquared), 4),
                "adj_r_squared": round(safe_float(model.rsquared_adj), 4),
                "std_error_estimate": round(np.sqrt(mse), 4),
                "durbin_watson": round(dw_stat, 4),
                "f_statistic": round(safe_float(model.fvalue), 4),
                "f_pvalue": round(safe_float(model.f_pvalue), 6),
                "aic": round(safe_float(model.aic), 4),
                "bic": round(safe_float(model.bic), 4),
                "log_likelihood": round(safe_float(model.llf), 4)
            },
            
            # ANOVA 테이블
            "anova_table": anova_table,
            
            # 계수
            "coefficients": coefficients,
            
            # 기술통계량 (Q1, Q3 포함)
            "descriptive_stats": descriptive_stats,
            
            # 상관행렬
            "correlation_matrix": correlation_matrix,
            
            # 잔차 진단 (Jarque-Bera, 이상치 포함)
            "residual_stats": residual_stats,
            
            # 실측치/예측치
            "actual_vs_predicted": actual_vs_predicted,
            
            # 산점도 데이터
            "scatter_data": scatter_data,
            
            # 해석
            "interpretation": interpretation
        }
        
        return result
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": f"분석 중 오류 발생: {str(e)}"}


def generate_interpretation(model, coefficients: List[Dict], removed_vars: List[str],
                           vif_dict: Dict, final_main_vars: List[str], 
                           interaction_terms: List[str], residual_stats: Dict) -> str:
    """
    회귀분석 결과 해석 생성
    
    Args:
        model: 회귀 모델
        coefficients: 계수 정보
        removed_vars: 제거된 변수
        vif_dict: VIF 딕셔너리
        final_main_vars: 최종 주효과 변수
        interaction_terms: 상호작용 항
        residual_stats: 잔차 통계
    
    Returns:
        해석 문자열
    """
    interpretation = []
    
    adj_r2 = model.rsquared_adj
    
    # 1. 모델 적합도
    if adj_r2 >= 0.7:
        interpretation.append(f"모델의 설명력이 매우 높습니다 (Adjusted R² = {adj_r2:.3f}).")
    elif adj_r2 >= 0.5:
        interpretation.append(f"모델의 설명력이 양호합니다 (Adjusted R² = {adj_r2:.3f}).")
    else:
        interpretation.append(f"모델의 설명력이 낮습니다 (Adjusted R² = {adj_r2:.3f}). 추가 변수가 필요할 수 있습니다.")
    
    # 2. 유의한 주효과
    significant_main = [c for c in coefficients 
                       if c.get('var_type') == 'main' and c['p_value'] < 0.05]
    if significant_main:
        var_names = ', '.join([v['variable'] for v in significant_main])
        interpretation.append(f"유의한 주효과(main effect): {var_names}.")
    
    # 3. 유의한 상호작용 효과
    significant_interaction = [c for c in coefficients 
                              if c.get('var_type') == 'interaction' and c['p_value'] < 0.05]
    if significant_interaction:
        int_names = ', '.join([v['variable'] for v in significant_interaction])
        interpretation.append(f"유의한 상호작용 (interaction effect): {int_names}. 변수들 조절효과가 있음을 의미합니다.")
    
    # 4. 제거된 변수
    if removed_vars:
        removed = ', '.join(removed_vars)
        interpretation.append(f"제거된 변수: {removed}.")
    
    # 5. 다중공선성 검사
    if vif_dict and len(vif_dict) > 0:
        max_vif = max(vif_dict.values())
        if max_vif < 5:
            interpretation.append("다중공선성 문제가 없습니다 (모든 VIF < 5).")
        elif max_vif < 10:
            interpretation.append("다중공선성이 있으나 허용 가능한 수준입니다 (VIF < 10).")
    
    # 6. 잔차 정규성 검정
    jb_pvalue = residual_stats.get('jarque_bera_pvalue', 1.0)
    if jb_pvalue > 0.05:
        interpretation.append(f"잔차가 정규분포를 따릅니다 (Jarque-Bera p = {jb_pvalue:.4f}).")
    else:
        interpretation.append(f"⚠️ 잔차가 정규분포를 따르지 않습니다 (Jarque-Bera p = {jb_pvalue:.4f}).")
    
    # 7. 자기상관 검정
    dw = residual_stats.get('durbin_watson', 2.0)
    if 1.5 <= dw <= 2.5:
        interpretation.append(f"자기상관 문제가 없습니다 (Durbin-Watson = {dw:.4f}).")
    else:
        interpretation.append(f"⚠️ 자기상관 문제가 있을 수 있습니다 (Durbin-Watson = {dw:.4f}).")
    
    # 8. 이상치
    outliers = residual_stats.get('outliers_count', 0)
    if outliers > 0:
        interpretation.append(f"⚠️ 이상치 {outliers}개 발견 ({residual_stats.get('outliers_percent', 0):.2f}%).")
    
    # 9. F-통계량
    if model.f_pvalue < 0.001:
        interpretation.append("모델이 통계적으로 매우 유의합니다 (p < 0.001).")
    elif model.f_pvalue < 0.05:
        interpretation.append("모델이 통계적으로 유의합니다 (p < 0.05).")
    
    return ' '.join(interpretation)


def calculate_interaction_effects(data: List[Dict],
                                   dependent_var: str,
                                   independent_vars: List[str]) -> Dict[str, Any]:
    """
    상호작용 효과 계산 (별도 분석용)
    
    Args:
        data: 데이터 목록
        dependent_var: 종속변수
        independent_vars: 독립변수 목록
    
    Returns:
        상호작용 효과 결과
    """
    try:
        df = pd.DataFrame(data)
        
        # 숫자형 변환
        all_vars = [dependent_var] + independent_vars
        for col in all_vars:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
        df = df.dropna()
        
        if len(independent_vars) < 2:
            return {"interactions": []}
        
        interactions = []
        
        # 2-way 상호작용만 계산
        for i in range(len(independent_vars)):
            for j in range(i + 1, len(independent_vars)):
                var1 = independent_vars[i]
                var2 = independent_vars[j]
                
                # 상호작용 항 생성
                interaction_name = f"{var1}×{var2}"
                df[interaction_name] = df[var1] * df[var2]
                
                # 상호작용 모델
                X_interaction = sm.add_constant(df[[var1, var2, interaction_name]])
                y = df[dependent_var]
                
                try:
                    model = sm.OLS(y, X_interaction).fit()
                    
                    interactions.append({
                        "variables": [var1, var2],
                        "interaction_term": interaction_name,
                        "coefficient": float(round(model.params[interaction_name], 4)),
                        "t_statistic": float(round(model.tvalues[interaction_name], 4)),
                        "p_value": float(round(model.pvalues[interaction_name], 4)),
                        "significant": model.pvalues[interaction_name] < 0.05
                    })
                except:
                    pass
        
        return {"interactions": interactions}
        
    except Exception as e:
        return {"error": str(e)}


# =====================================================
# Lasso 회귀분석 (L1 정규화)
# sklearn의 LassoCV를 사용한 자동 변수 선택
# =====================================================

def run_lasso_regression(data: List[Dict], 
                         dependent_var: str, 
                         independent_vars: List[str],
                         correlation_threshold: float = 0.1) -> Dict[str, Any]:
    """
    Lasso 회귀분석 실행 (L1 정규화)
    
    주요 기능:
    - 결측치 평균값 대체
    - 상관계수 기반 변수 필터링
    - LassoCV로 최적 alpha 자동 탐색
    - coefficient가 0이 아닌 변수만 선택
    - MAE, RMSE 정확도 지표
    
    Args:
        data: 데이터 목록 (딕셔너리 리스트)
        dependent_var: 종속변수명
        independent_vars: 독립변수 목록
        correlation_threshold: 상관계수 필터링 임계값 (기본 0.1)
    
    Returns:
        Lasso 회귀분석 결과 딕셔너리
    """
    from sklearn.linear_model import LassoCV
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import mean_absolute_error, mean_squared_error
    from sklearn.model_selection import cross_val_score
    
    try:
        print(f"\n=== LASSO 회귀분석 ===")
        print(f"종속변수: {dependent_var}")
        print(f"독립변수: {independent_vars}")
        
        # 데이터프레임 생성
        df = pd.DataFrame(data)
        
        # 분석에 필요한 컬럼만 추출
        all_vars = [dependent_var] + independent_vars
        analysis_df = df[all_vars].copy()
        
        # 숫자형으로 변환
        for col in all_vars:
            analysis_df[col] = pd.to_numeric(analysis_df[col], errors='coerce')
        
        # =====================================================
        # 1단계: 결측치 평균값 대체 (Lasso 전용)
        # =====================================================
        missing_info = {}
        for col in all_vars:
            missing_count = analysis_df[col].isna().sum()
            if missing_count > 0:
                col_mean = analysis_df[col].mean()
                analysis_df[col] = analysis_df[col].fillna(col_mean)
                missing_info[col] = {
                    "missing_count": int(missing_count),
                    "filled_with_mean": round(float(col_mean), 4)
                }
                print(f"  [결측치 처리] {col}: {missing_count}개 → 평균값({col_mean:.4f})으로 대체")
        
        initial_count = len(analysis_df)
        
        # Lasso는 p > n 상황에서도 작동 가능하므로 제약 조건 완화
        # 단, 교차검증(CV=5)을 위해 최소 5개 이상의 데이터는 필요
        if initial_count < 5:
            return {"error": "데이터가 너무 적습니다. 최소 5개 이상의 행이 필요합니다."}
        
        # =====================================================
        # 2단계: 상관계수 기반 변수 필터링
        # =====================================================
        y = analysis_df[dependent_var]
        correlations_with_y = {}
        filtered_vars = []
        removed_by_correlation = []
        
        for var in independent_vars:
            corr = analysis_df[var].corr(y)
            correlations_with_y[var] = round(float(corr), 4)
            
            if abs(corr) >= correlation_threshold:
                filtered_vars.append(var)
            else:
                removed_by_correlation.append(f"{var} (r={corr:.4f})")
                print(f"  [상관계수 필터링] {var} 제거 (r={corr:.4f} < {correlation_threshold})")
        
        print(f"상관계수 필터링 후 남은 변수: {len(filtered_vars)}개")
        
        if len(filtered_vars) == 0:
            return {"error": f"모든 독립변수가 상관계수 필터링으로 제거되었습니다 (임계값: {correlation_threshold})."}
        
        # =====================================================
        # 3단계: 데이터 표준화
        # =====================================================
        X = analysis_df[filtered_vars].values
        y_values = y.values
        
        scaler_X = StandardScaler()
        scaler_y = StandardScaler()
        
        X_scaled = scaler_X.fit_transform(X)
        y_scaled = scaler_y.fit_transform(y_values.reshape(-1, 1)).ravel()
        
        # =====================================================
        # 4단계: LassoCV로 최적 alpha 탐색 및 모델 학습
        # =====================================================
        # alpha 후보값 설정 (0.001 ~ 10)
        alphas = np.logspace(-3, 1, 100)
        
        lasso_cv = LassoCV(
            alphas=alphas,
            cv=5,  # 5-fold cross-validation
            max_iter=10000,
            random_state=42
        )
        
        lasso_cv.fit(X_scaled, y_scaled)
        
        optimal_alpha = float(lasso_cv.alpha_)
        print(f"최적 alpha: {optimal_alpha:.6f}")
        
        # =====================================================
        # 5단계: coefficient가 0이 아닌 변수 선택
        # =====================================================
        lasso_coefficients = lasso_cv.coef_
        selected_vars = []
        selected_coefficients = []
        zero_vars = []
        
        for i, var in enumerate(filtered_vars):
            coef = lasso_coefficients[i]
            if abs(coef) > 1e-10:  # 0이 아닌 경우
                selected_vars.append(var)
                selected_coefficients.append({
                    "variable": var,
                    "coefficient_scaled": round(float(coef), 6),
                    "correlation_with_y": correlations_with_y[var]
                })
                print(f"  [선택] {var}: coef={coef:.6f}")
            else:
                zero_vars.append(var)
                print(f"  [제외] {var}: coef=0")
        
        print(f"Lasso 선택 변수: {len(selected_vars)}개")
        
        if len(selected_vars) == 0:
            return {"error": "Lasso가 모든 변수를 제거했습니다. alpha 값이 너무 높을 수 있습니다."}
        
        # =====================================================
        # 6단계: 예측 및 정확도 지표 계산
        # =====================================================
        y_pred_scaled = lasso_cv.predict(X_scaled)
        y_pred = scaler_y.inverse_transform(y_pred_scaled.reshape(-1, 1)).ravel()
        
        # MAE, RMSE 계산
        mae = float(mean_absolute_error(y_values, y_pred))
        rmse = float(np.sqrt(mean_squared_error(y_values, y_pred)))
        
        # R² 계산
        ss_res = np.sum((y_values - y_pred) ** 2)
        ss_tot = np.sum((y_values - np.mean(y_values)) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
        
        # Cross-validation 점수
        cv_scores = cross_val_score(lasso_cv, X_scaled, y_scaled, cv=5, scoring='r2')
        cv_mean = float(np.mean(cv_scores))
        cv_std = float(np.std(cv_scores))
        
        print(f"MAE: {mae:.4f}, RMSE: {rmse:.4f}, R²: {r_squared:.4f}")
        
        # =====================================================
        # 7단계: 원래 스케일의 계수 계산 (해석용)
        # =====================================================
        # 표준화된 계수를 원래 스케일로 변환
        original_scale_coefficients = []
        
        for i, var in enumerate(filtered_vars):
            scaled_coef = lasso_coefficients[i]
            if abs(scaled_coef) > 1e-10:
                # 원래 스케일 계수: β_original = β_scaled * (σ_y / σ_x)
                original_coef = scaled_coef * (scaler_y.scale_[0] / scaler_X.scale_[i])
                original_scale_coefficients.append({
                    "variable": var,
                    "coefficient": round(float(original_coef), 6),
                    "coefficient_scaled": round(float(scaled_coef), 6),
                    "correlation_with_y": correlations_with_y[var]
                })
        
        # Intercept 계산
        intercept_scaled = lasso_cv.intercept_
        intercept = scaler_y.mean_[0] + intercept_scaled * scaler_y.scale_[0]
        for i, var in enumerate(filtered_vars):
            if abs(lasso_coefficients[i]) > 1e-10:
                intercept -= (lasso_coefficients[i] * scaler_y.scale_[0] / scaler_X.scale_[i]) * scaler_X.mean_[i]
        
        # =====================================================
        # 8단계: 회귀식 생성
        # =====================================================
        equation_parts = [f"{round(intercept, 4)}"]
        for coef_info in original_scale_coefficients:
            coef = coef_info['coefficient']
            var = coef_info['variable']
            sign = "+" if coef >= 0 else "-"
            equation_parts.append(f"{sign} {abs(round(coef, 4))} × {var}")
        
        regression_equation = f"Y = " + " ".join(equation_parts)
        
        # =====================================================
        # 9단계: 기술통계량 및 상관행렬
        # =====================================================
        descriptive_vars = [dependent_var] + selected_vars
        descriptive_stats = calculate_descriptive_stats(analysis_df, descriptive_vars)
        correlation_matrix = calculate_correlation_matrix(analysis_df, descriptive_vars)
        
        # =====================================================
        # 10단계: 실측치/예측치 (첫 50개)
        # =====================================================
        residuals = y_values - y_pred
        actual_vs_predicted = [
            {
                "index": i + 1,
                "actual": round(safe_float(actual), 4),
                "predicted": round(safe_float(pred), 4),
                "residual": round(safe_float(res), 4)
            }
            for i, (actual, pred, res) in enumerate(zip(y_values[:50], y_pred[:50], residuals[:50]))
        ]
        
        # =====================================================
        # 11단계: 산점도 데이터
        # =====================================================
        scatter_data = {}
        for var in selected_vars:
            scatter_data[var] = [
                {
                    "x": round(safe_float(x_val), 4),
                    "y": round(safe_float(y_val), 4)
                }
                for x_val, y_val in zip(analysis_df[var].values, y_values)
            ]
        
        # =====================================================
        # 12단계: 잔차 통계
        # =====================================================
        residual_stats = {
            "mean": round(safe_float(np.mean(residuals)), 6),
            "std": round(safe_float(np.std(residuals)), 4),
            "min": round(safe_float(np.min(residuals)), 4),
            "max": round(safe_float(np.max(residuals)), 4),
            "mae": round(mae, 4),
            "rmse": round(rmse, 4)
        }
        
        # =====================================================
        # 결과 해석 생성
        # =====================================================
        interpretation = generate_lasso_interpretation(
            optimal_alpha, r_squared, mae, rmse,
            selected_vars, removed_by_correlation, zero_vars,
            original_scale_coefficients, cv_mean, cv_std
        )
        
        # =====================================================
        # 결과 반환
        # =====================================================
        result = {
            "success": True,
            "method": "lasso",
            "n_observations": int(initial_count),
            "dependent_variable": dependent_var,
            "independent_variables": selected_vars,
            "final_main_vars": selected_vars,
            "interaction_terms": [],  # Lasso는 상호작용 항 미생성
            "removed_vars": removed_by_correlation + [f"{v} (Lasso 제외)" for v in zero_vars],
            
            # 회귀식
            "regression_equation": regression_equation,
            
            # Lasso 전용 결과
            "lasso_results": {
                "optimal_alpha": round(optimal_alpha, 6),
                "correlation_threshold": correlation_threshold,
                "filtered_vars_by_correlation": filtered_vars,
                "correlations_with_y": correlations_with_y,
                "selected_vars": selected_vars,
                "zero_coefficient_vars": zero_vars,
                "coefficients": original_scale_coefficients,
                "intercept": round(float(intercept), 6),
                "cv_r2_mean": round(cv_mean, 4),
                "cv_r2_std": round(cv_std, 4)
            },
            
            # 모델 요약
            "model_summary": {
                "r": round(float(np.sqrt(r_squared)), 4),
                "r_squared": round(float(r_squared), 4),
                "adj_r_squared": round(float(r_squared), 4),  # Lasso는 조정 R² 대신 CV R² 사용
                "std_error_estimate": round(rmse, 4),
                "mae": round(mae, 4),
                "rmse": round(rmse, 4),
                "cv_r2_mean": round(cv_mean, 4),
                "cv_r2_std": round(cv_std, 4),
                "f_statistic": None,  # Lasso는 F-통계량 미제공
                "f_pvalue": None,
                "aic": None,
                "bic": None,
                "log_likelihood": None,
                "durbin_watson": None
            },
            
            # ANOVA (Lasso는 제공하지 않음)
            "anova_table": [],
            
            # 계수 (Lasso 스타일)
            "coefficients": [
                {
                    "variable": "상수항",
                    "b": round(float(intercept), 6),
                    "std_error": None,
                    "beta": None,
                    "t_statistic": None,
                    "p_value": None,
                    "tolerance": None,
                    "vif": None,
                    "var_type": "constant"
                }
            ] + [
                {
                    "variable": c["variable"],
                    "b": c["coefficient"],
                    "std_error": None,
                    "beta": c["coefficient_scaled"],  # 표준화 계수
                    "t_statistic": None,
                    "p_value": None,
                    "tolerance": None,
                    "vif": None,
                    "var_type": "main"
                }
                for c in original_scale_coefficients
            ],
            
            # 기술통계량
            "descriptive_stats": descriptive_stats,
            
            # 상관행렬
            "correlation_matrix": correlation_matrix,
            
            # 잔차 통계
            "residual_stats": residual_stats,
            
            # 실측치/예측치
            "actual_vs_predicted": actual_vs_predicted,
            
            # 산점도 데이터
            "scatter_data": scatter_data,
            
            # 결측치 처리 정보
            "missing_value_info": missing_info,
            
            # 해석
            "interpretation": interpretation
        }
        
        return result
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": f"Lasso 분석 중 오류 발생: {str(e)}"}


def generate_lasso_interpretation(optimal_alpha: float, r_squared: float,
                                   mae: float, rmse: float,
                                   selected_vars: List[str],
                                   removed_by_correlation: List[str],
                                   zero_vars: List[str],
                                   coefficients: List[Dict],
                                   cv_mean: float, cv_std: float) -> str:
    """
    Lasso 회귀분석 결과 해석 생성
    """
    interpretation = []
    
    # 1. 모델 설명력
    if r_squared >= 0.7:
        interpretation.append(f"Lasso 모델의 설명력이 매우 높습니다 (R² = {r_squared:.3f}).")
    elif r_squared >= 0.5:
        interpretation.append(f"Lasso 모델의 설명력이 양호합니다 (R² = {r_squared:.3f}).")
    else:
        interpretation.append(f"Lasso 모델의 설명력이 낮습니다 (R² = {r_squared:.3f}). 추가 변수가 필요할 수 있습니다.")
    
    # 2. 최적 alpha
    interpretation.append(f"최적 정규화 강도: α = {optimal_alpha:.6f}.")
    
    # 3. 변수 선택 결과
    interpretation.append(f"Lasso가 {len(selected_vars)}개 변수를 선택했습니다: {', '.join(selected_vars)}.")
    
    # 4. 제거된 변수
    total_removed = len(removed_by_correlation) + len(zero_vars)
    if total_removed > 0:
        interpretation.append(f"총 {total_removed}개 변수가 제거되었습니다 (상관계수 필터링: {len(removed_by_correlation)}개, Lasso 제외: {len(zero_vars)}개).")
    
    # 5. 예측 정확도
    interpretation.append(f"예측 정확도: MAE = {mae:.4f}, RMSE = {rmse:.4f}.")
    
    # 6. 교차검증 결과
    interpretation.append(f"5-Fold 교차검증 R²: {cv_mean:.4f} (±{cv_std:.4f}).")
    
    # 7. 주요 영향 변수
    if coefficients:
        sorted_coefs = sorted(coefficients, key=lambda x: abs(x['coefficient_scaled']), reverse=True)
        top_vars = [c['variable'] for c in sorted_coefs[:3]]
        interpretation.append(f"가장 영향력 있는 변수: {', '.join(top_vars)}.")
    
    return ' '.join(interpretation)
