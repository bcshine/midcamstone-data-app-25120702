# =====================================================
# 회귀분석 로직 모듈
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
                    "mean": round(safe_float(col_data.mean()), 4),
                    "std": round(safe_float(col_data.std()), 4),
                    "min": round(safe_float(col_data.min()), 4),
                    "q25": round(safe_float(col_data.quantile(0.25)), 4),
                    "median": round(safe_float(col_data.median()), 4),
                    "q75": round(safe_float(col_data.quantile(0.75)), 4),
                    "max": round(safe_float(col_data.max()), 4),
                    "skewness": round(safe_float(col_data.skew()), 4),
                    "kurtosis": round(safe_float(col_data.kurtosis()), 4)
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
                corr_value = corr_matrix.loc[var1, var2]
                # NaN 값을 safe_float로 처리 (기본값 0.0)
                row[var2] = round(safe_float(corr_value, 0.0), 4)
            else:
                row[var2] = 0.0
        correlation_list.append(row)
    
    return correlation_list


def run_regression(data: List[Dict], 
                   dependent_var: str, 
                   independent_vars: List[str],
                   method: str = "enter") -> Dict[str, Any]:
    """
    다중회귀분석 실행
    
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
        # =====================================================
        # 0단계: 입력 데이터 검증
        # =====================================================
        if not data or len(data) == 0:
            return {"error": "데이터가 비어있습니다."}
        
        if not dependent_var:
            return {"error": "종속변수가 지정되지 않았습니다."}
        
        if not independent_vars or len(independent_vars) == 0:
            return {"error": "독립변수가 지정되지 않았습니다."}
        
        # 데이터프레임 생성
        df = pd.DataFrame(data)
        
        # 필요한 컬럼이 존재하는지 확인
        all_vars = [dependent_var] + independent_vars
        missing_cols = [col for col in all_vars if col not in df.columns]
        if missing_cols:
            return {"error": f"데이터에 없는 컬럼: {', '.join(missing_cols)}"}
        
        # 분석에 필요한 컬럼만 추출
        analysis_df = df[all_vars].copy()
        
        # 숫자형으로 변환
        for col in all_vars:
            analysis_df[col] = pd.to_numeric(analysis_df[col], errors='coerce')
        
        # 결측치 제거
        analysis_df = analysis_df.dropna()
        initial_count = len(analysis_df)
        
        if initial_count < 10:
            return {"error": f"유효한 데이터가 {initial_count}개뿐입니다. 최소 10개 이상의 데이터가 필요합니다."}
        
        if initial_count < len(independent_vars) + 2:
            return {"error": "데이터가 충분하지 않습니다. 최소 (독립변수 수 + 2)개의 행이 필요합니다."}
        
        # =====================================================
        # 상수 변수 (분산 = 0) 사전 제거
        # =====================================================
        constant_vars = []
        valid_independent_vars = []
        
        for var in independent_vars:
            var_std = analysis_df[var].std()
            if var_std == 0 or np.isnan(var_std):
                constant_vars.append(var)
            else:
                valid_independent_vars.append(var)
        
        if constant_vars:
            print(f"  [경고] 상수 변수 제외됨: {constant_vars}")
        
        if len(valid_independent_vars) == 0:
            return {"error": "모든 독립변수가 상수값입니다. 변동이 있는 변수를 선택해주세요."}
        
        # 유효한 독립변수로 교체
        independent_vars = valid_independent_vars
        
        # 종속변수도 상수인지 확인
        y_std = analysis_df[dependent_var].std()
        if y_std == 0 or np.isnan(y_std):
            return {"error": "종속변수가 상수값입니다. 변동이 있는 변수를 선택해주세요."}
        
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
                interaction_name = f"{var1}*{var2}"
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
                X = sm.add_constant(analysis_df[current_vars], has_constant='add')
                y = analysis_df[dependent_var]
                model = sm.OLS(y, X).fit()
                
                # p-value가 가장 높은 변수 찾기 (상수항 제외)
                const_col = 'const' if 'const' in model.pvalues.index else model.pvalues.index[0]
                pvalues = model.pvalues.drop(const_col)
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
        X_with_const = sm.add_constant(X, has_constant='add')
        
        model = sm.OLS(y, X_with_const).fit()
        
        # 상수항 컬럼명 확인
        const_col = 'const' if 'const' in model.params.index else model.params.index[0]
        
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
        # 표준편차가 0인 경우 방지 (상수 잔차)
        residual_std = np.std(residuals)
        if residual_std == 0 or np.isnan(residual_std):
            standardized_residuals = np.zeros_like(residuals)
        else:
            standardized_residuals = residuals / residual_std
        
        # Jarque-Bera 정규성 검정 (데이터가 충분할 때만)
        if len(residuals) >= 8:
            jb_stat, jb_pvalue = stats.jarque_bera(residuals)
        else:
            jb_stat, jb_pvalue = 0.0, 1.0  # 데이터 부족 시 기본값
        
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
        std_y = safe_float(y.std())
        if std_y == 0:
            std_y = 1.0  # 종속변수 표준편차가 0이면 1로 설정 (상수 종속변수 방지)
        
        coefficients = []
        
        # 상수항
        coefficients.append({
            "variable": "상수항",
            "b": round(safe_float(model.params[const_col]), 6),
            "std_error": round(safe_float(model.bse[const_col]), 6),
            "beta": None,
            "t_statistic": round(safe_float(model.tvalues[const_col]), 4),
            "p_value": round(safe_float(model.pvalues[const_col]), 6),
            "tolerance": None,
            "vif": None,
            "var_type": "constant"
        })
        
        # 주효과
        for var in final_main_vars:
            std_x = safe_float(analysis_df[var].std())
            if std_x == 0:
                std_x = 1.0  # 상수 변수 방지
            
            param_val = safe_float(model.params[var])
            beta = param_val * (std_x / std_y)
            
            vif_value = vif_dict.get(var)
            tolerance = round(1.0 / vif_value, 4) if vif_value and vif_value > 0 else None
            
            coefficients.append({
                "variable": var,
                "b": round(param_val, 6),
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
            std_x = safe_float(analysis_df[var].std())
            if std_x == 0:
                std_x = 1.0  # 상수 상호작용 항 방지
            
            param_val = safe_float(model.params[var])
            beta = param_val * (std_x / std_y)
            
            coefficients.append({
                "variable": var,
                "b": round(param_val, 6),
                "std_error": round(safe_float(model.bse[var]), 6),
                "beta": round(safe_float(beta), 6),
                "t_statistic": round(safe_float(model.tvalues[var]), 4),
                "p_value": round(safe_float(model.pvalues[var]), 6),
                "tolerance": None,
                "vif": None,
                "var_type": "interaction"
            })
        
        # =====================================================
        # 회귀식 생성
        # =====================================================
        const_coef = safe_float(model.params[const_col])
        equation_parts = [f"{round(const_coef, 4)}"]
        for var in all_analysis_vars:
            coef = safe_float(model.params[var])
            sign = "+" if coef >= 0 else "-"
            equation_parts.append(f"{sign} {abs(round(coef, 4))} * {var}")
        
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
        # R² 값이 음수거나 NaN인 경우 방지
        rsquared_val = safe_float(model.rsquared, 0.0)
        if rsquared_val < 0:
            rsquared_val = 0.0
        r_multiple = float(np.sqrt(rsquared_val))
        
        # 표준오차 추정치 (mse가 음수일 수 있으니 방지)
        std_error_estimate = round(safe_float(np.sqrt(max(mse, 0))), 4)
        
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
                "r": round(safe_float(r_multiple), 4),
                "r_squared": round(rsquared_val, 4),
                "adj_r_squared": round(safe_float(model.rsquared_adj), 4),
                "std_error_estimate": std_error_estimate,
                "durbin_watson": round(safe_float(dw_stat), 4),
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
        interpretation.append(f"유의한 주효과: {var_names}.")
    
    # 3. 유의한 상호작용 효과
    significant_interaction = [c for c in coefficients 
                              if c.get('var_type') == 'interaction' and c['p_value'] < 0.05]
    if significant_interaction:
        int_names = ', '.join([v['variable'] for v in significant_interaction])
        interpretation.append(f"유의한 상호작용 효과: {int_names}. 변수들 간 조절효과가 있습니다.")
    
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
        interpretation.append(f"주의: 잔차가 정규분포를 따르지 않습니다 (Jarque-Bera p = {jb_pvalue:.4f}).")
    
    # 7. 자기상관 검정
    dw = residual_stats.get('durbin_watson', 2.0)
    if 1.5 <= dw <= 2.5:
        interpretation.append(f"자기상관 문제가 없습니다 (Durbin-Watson = {dw:.4f}).")
    else:
        interpretation.append(f"주의: 자기상관 문제가 있을 수 있습니다 (Durbin-Watson = {dw:.4f}).")
    
    # 8. 이상치
    outliers = residual_stats.get('outliers_count', 0)
    if outliers > 0:
        interpretation.append(f"주의: 이상치 {outliers}개 발견 ({residual_stats.get('outliers_percent', 0):.2f}%).")
    
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
        
        # 데이터가 충분하지 않은 경우
        if len(df) < 10:
            return {"interactions": [], "message": "데이터가 충분하지 않습니다."}
        
        if len(independent_vars) < 2:
            return {"interactions": []}
        
        interactions = []
        
        # 2-way 상호작용만 계산
        for i in range(len(independent_vars)):
            for j in range(i + 1, len(independent_vars)):
                var1 = independent_vars[i]
                var2 = independent_vars[j]
                
                # 상호작용 항 생성
                interaction_name = f"{var1}*{var2}"
                df[interaction_name] = df[var1] * df[var2]
                
                # 상호작용 모델
                X_interaction = sm.add_constant(df[[var1, var2, interaction_name]], has_constant='add')
                y = df[dependent_var]
                
                try:
                    model = sm.OLS(y, X_interaction).fit()
                    
                    # NaN 방지를 위한 safe_float 적용
                    coef_val = safe_float(model.params[interaction_name])
                    t_val = safe_float(model.tvalues[interaction_name])
                    p_val = safe_float(model.pvalues[interaction_name], 1.0)  # 기본값 1.0 (유의하지 않음)
                    
                    interactions.append({
                        "variables": [var1, var2],
                        "interaction_term": interaction_name,
                        "coefficient": round(coef_val, 4),
                        "t_statistic": round(t_val, 4),
                        "p_value": round(p_val, 4),
                        "significant": p_val < 0.05
                    })
                except Exception as model_error:
                    # 모델 피팅 실패 시 건너뛰기
                    print(f"  상호작용 분석 실패: {interaction_name} - {str(model_error)}")
                    continue
        
        return {"interactions": interactions}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
