# =====================================================
# ?뚭?遺꾩꽍 濡쒖쭅 紐⑤뱢 (?낃렇?덉씠??踰꾩쟾)
# statsmodels瑜??ъ슜???ㅼ쨷?뚭?遺꾩꽍 援ы쁽
# SPSS ?ㅽ???寃곌낵 異쒕젰 吏??
# 
# 二쇱슂 湲곕뒫:
# - 2-way ?곹샇?묒슜 ?④낵 ?먮룞 ?앹꽦
# - VIF > 10 蹂???먮룞 ?쒓굅 (?ㅼ쨷怨듭꽑???닿껐)
# - Jarque-Bera ?뺢퇋??寃??
# - ?댁긽移?遺꾩꽍 (?쒖????붿감 > 3)
# - ?щ텇?꾩닔 (Q1, Q3) ?ы븿
# - ?쒓굅??蹂???곸꽭 ?쒖떆
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
    NaN, Inf瑜??덉쟾?섍쾶 泥섎━?섎뒗 float 蹂???⑥닔
    
    Args:
        value: 蹂?섑븷 媛?
        default: 湲곕낯媛?
    
    Returns:
        ?덉쟾?섍쾶 蹂?섎맂 float 媛?
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
    VIF (Variance Inflation Factor) 怨꾩궛
    ?ㅼ쨷怨듭꽑??吏꾨떒???ъ슜
    
    Args:
        df: ?곗씠?고봽?덉엫
        independent_vars: ?낅┰蹂??紐⑸줉
    
    Returns:
        蹂?섎퀎 VIF ?뺤뀛?덈━
    """
    vif_data = {}
    
    if len(independent_vars) < 2:
        # ?낅┰蹂?섍? 1媛쒕㈃ VIF = 1
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
    VIF > threshold 蹂?섎? 諛섎났?곸쑝濡??쒓굅?섏뿬 ?ㅼ쨷怨듭꽑???닿껐
    
    Args:
        df: ?곗씠?고봽?덉엫
        independent_vars: ?낅┰蹂??紐⑸줉
        threshold: VIF ?꾧퀎媛?(湲곕낯 10)
    
    Returns:
        (?⑥? 蹂??紐⑸줉, ?쒓굅??蹂??紐⑸줉)
    """
    remaining_vars = independent_vars.copy()
    removed_vars = []
    
    while len(remaining_vars) > 1:
        vif_dict = calculate_vif(df, remaining_vars)
        max_vif = max(vif_dict.values())
        
        if max_vif <= threshold:
            break
        
        # VIF媛 媛???믪? 蹂???쒓굅
        max_var = max(vif_dict, key=vif_dict.get)
        remaining_vars.remove(max_var)
        removed_vars.append(f"{max_var} (VIF={vif_dict[max_var]:.2f})")
        print(f"  [?ㅼ쨷怨듭꽑???쒓굅] {max_var} (VIF={vif_dict[max_var]})")
    
    return remaining_vars, removed_vars


def calculate_descriptive_stats(df: pd.DataFrame, columns: List[str]) -> List[Dict[str, Any]]:
    """
    湲곗닠?듦퀎??怨꾩궛 (Q1, Q3 ?ы븿)
    
    Args:
        df: ?곗씠?고봽?덉엫
        columns: 遺꾩꽍??而щ읆 紐⑸줉
    
    Returns:
        湲곗닠?듦퀎??由ъ뒪??
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
                    "q25": float(round(col_data.quantile(0.25), 4)),  # Q1 異붽?
                    "median": float(round(col_data.median(), 4)),
                    "q75": float(round(col_data.quantile(0.75), 4)),  # Q3 異붽?
                    "max": float(round(col_data.max(), 4)),
                    "skewness": float(round(col_data.skew(), 4)),
                    "kurtosis": float(round(col_data.kurtosis(), 4))
                })
    
    return stats_list


def calculate_correlation_matrix(df: pd.DataFrame, columns: List[str]) -> List[Dict[str, Any]]:
    """
    ?곴??됰젹 怨꾩궛
    
    Args:
        df: ?곗씠?고봽?덉엫
        columns: 遺꾩꽍??而щ읆 紐⑸줉
    
    Returns:
        ?곴??됰젹 由ъ뒪??
    """
    # ?レ옄?뺤쑝濡?蹂??
    numeric_df = df[columns].apply(pd.to_numeric, errors='coerce').dropna()
    
    if len(numeric_df) < 3:
        return []
    
    # ?쇱뼱???곴?怨꾩닔
    corr_matrix = numeric_df.corr()
    
    # 由ъ뒪???뺥깭濡?蹂??
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
    ?ㅼ쨷?뚭?遺꾩꽍 ?ㅽ뻾 (superbase_link ?ㅽ????낃렇?덉씠??
    
    二쇱슂 湲곕뒫:
    - 2-way ?곹샇?묒슜 ?④낵 ?먮룞 ?앹꽦
    - VIF > 10 蹂???먮룞 ?쒓굅
    - Jarque-Bera ?뺢퇋??寃??
    - ?댁긽移?遺꾩꽍
    - ?щ텇?꾩닔 ?ы븿
    
    Args:
        data: ?곗씠??紐⑸줉 (?뺤뀛?덈━ 由ъ뒪??
        dependent_var: 醫낆냽蹂?섎챸
        independent_vars: ?낅┰蹂??紐⑸줉
        method: "enter" ?먮뒗 "stepwise"
    
    Returns:
        ?뚭?遺꾩꽍 寃곌낵 ?뺤뀛?덈━
    """
    try:
        # ?곗씠?고봽?덉엫 ?앹꽦
        df = pd.DataFrame(data)
        
        # 遺꾩꽍???꾩슂??而щ읆留?異붿텧
        all_vars = [dependent_var] + independent_vars
        analysis_df = df[all_vars].copy()
        
        # ?レ옄?뺤쑝濡?蹂??
        for col in all_vars:
            analysis_df[col] = pd.to_numeric(analysis_df[col], errors='coerce')
        
        # 寃곗륫移??쒓굅
        analysis_df = analysis_df.dropna()
        initial_count = len(analysis_df)
        
        if initial_count < len(independent_vars) + 2:
            return {"error": "?곗씠?곌? 異⑸텇?섏? ?딆뒿?덈떎. 理쒖냼 (?낅┰蹂????+ 2)媛쒖쓽 ?됱씠 ?꾩슂?⑸땲??"}
        
        # =====================================================
        # 1?④퀎: ?ㅼ쨷怨듭꽑???쒓굅 (VIF > 10)
        # =====================================================
        print(f"\n=== {method.upper()} 諛⑹떇 ?뚭?遺꾩꽍 ===")
        print(f"醫낆냽蹂?? {dependent_var}")
        print(f"?낅┰蹂?? {independent_vars}")
        
        final_main_vars, removed_by_vif = remove_multicollinearity(
            analysis_df, independent_vars, threshold=10
        )
        
        if len(final_main_vars) == 0:
            return {"error": "紐⑤뱺 ?낅┰蹂?섍? ?ㅼ쨷怨듭꽑?깆쑝濡??쒓굅?섏뿀?듬땲??"}
        
        # =====================================================
        # 2?④퀎: 2-way ?곹샇?묒슜 ???앹꽦
        # =====================================================
        interaction_terms = []
        if len(final_main_vars) >= 2:
            for var1, var2 in combinations(final_main_vars, 2):
                interaction_name = f"{var1}횞{var2}"
                analysis_df[interaction_name] = analysis_df[var1] * analysis_df[var2]
                interaction_terms.append(interaction_name)
            print(f"?앹꽦???곹샇?묒슜 ?? {len(interaction_terms)}媛?)
        
        # 二쇳슚怨?+ ?곹샇?묒슜 ??
        all_analysis_vars = final_main_vars + interaction_terms
        
        # =====================================================
        # 3?④퀎: Stepwise 蹂???좏깮 (method媛 stepwise??寃쎌슦)
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
                
                # p-value媛 媛???믪? 蹂??李얘린 (?곸닔???쒖쇅)
                # ?곸닔??而щ읆紐낆씠 'const' ?먮뒗 ?ㅻⅨ ?대쫫?????덉쓬
                const_col = 'const' if 'const' in model.pvalues.index else model.pvalues.index[0]
                pvalues = model.pvalues.drop(const_col)
                max_pvalue = pvalues.max()
                
                if max_pvalue > p_threshold:
                    var_to_remove = pvalues.idxmax()
                    current_vars.remove(var_to_remove)
                    removed_by_pvalue.append(f"{var_to_remove} (p={max_pvalue:.4f})")
                    print(f"  [p-value ?쒓굅] {var_to_remove} (p={max_pvalue:.4f})")
                else:
                    break
            
            if len(current_vars) == 0:
                return {"error": "紐⑤뱺 ?낅┰蹂?섍? ?쒓굅?섏뿀?듬땲?? (p-value > 0.05)"}
            
            all_analysis_vars = current_vars
            # 理쒖쥌 二쇳슚怨?蹂???낅뜲?댄듃
            final_main_vars = [v for v in all_analysis_vars if v in final_main_vars]
            interaction_terms = [v for v in all_analysis_vars if v in interaction_terms]
        
        # =====================================================
        # 4?④퀎: 理쒖쥌 ?뚭?遺꾩꽍 ?ㅽ뻾
        # =====================================================
        X = analysis_df[all_analysis_vars]
        y = analysis_df[dependent_var]
        X_with_const = sm.add_constant(X, has_constant='add')
        
        model = sm.OLS(y, X_with_const).fit()
        
        # ?곸닔??而щ읆紐??뺤씤
        const_col = 'const' if 'const' in model.params.index else model.params.index[0]
        
        # ?덉륫媛?諛??붿감
        y_pred = model.predict(X_with_const)
        residuals = y - y_pred
        
        # =====================================================
        # 湲곗닠?듦퀎??怨꾩궛 (Q1, Q3 ?ы븿)
        # =====================================================
        descriptive_vars = [dependent_var] + final_main_vars
        descriptive_stats = calculate_descriptive_stats(analysis_df, descriptive_vars)
        
        # =====================================================
        # ?곴?愿怨??됰젹
        # =====================================================
        correlation_matrix = calculate_correlation_matrix(analysis_df, descriptive_vars)
        
        # =====================================================
        # ANOVA ??怨꾩궛
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
                "source": "?뚭?(Regression)",
                "ss": round(safe_float(ssr), 4),
                "df": int(df_regression),
                "ms": round(safe_float(msr), 4),
                "f": round(safe_float(model.fvalue), 4),
                "p_value": round(safe_float(model.f_pvalue), 6)
            },
            {
                "source": "?붿감(Residual)",
                "ss": round(safe_float(sse), 4),
                "df": int(df_residual),
                "ms": round(safe_float(mse), 4),
                "f": None,
                "p_value": None
            },
            {
                "source": "?꾩껜(Total)",
                "ss": round(safe_float(sst), 4),
                "df": int(df_total),
                "ms": None,
                "f": None,
                "p_value": None
            }
        ]
        
        # =====================================================
        # ?붿감 吏꾨떒 (Jarque-Bera, ?댁긽移?遺꾩꽍 異붽?)
        # =====================================================
        standardized_residuals = residuals / np.std(residuals)
        
        # Jarque-Bera ?뺢퇋??寃??
        jb_stat, jb_pvalue = stats.jarque_bera(residuals)
        
        # Durbin-Watson ?먭린?곴? 寃??
        dw_stat = float(durbin_watson(residuals))
        
        # ?댁긽移?遺꾩꽍 (?쒖????붿감 ?덈뙎媛?> 3)
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
        # VIF 怨꾩궛 (二쇳슚怨쇰쭔)
        # =====================================================
        vif_dict = calculate_vif(analysis_df, final_main_vars) if final_main_vars else {}
        
        # =====================================================
        # 怨꾩닔 ?뺣낫 (?쒖???怨꾩닔 ?ы븿)
        # =====================================================
        std_y = y.std()
        coefficients = []
        
        # ?곸닔??
        coefficients.append({
            "variable": "?곸닔??,
            "b": round(safe_float(model.params[const_col]), 6),
            "std_error": round(safe_float(model.bse[const_col]), 6),
            "beta": None,  # ?곸닔??? ?쒖???怨꾩닔 ?놁쓬
            "t_statistic": round(safe_float(model.tvalues[const_col]), 4),
            "p_value": round(safe_float(model.pvalues[const_col]), 6),
            "tolerance": None,
            "vif": None,
            "var_type": "constant"
        })
        
        # 二쇳슚怨?
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
        
        # ?곹샇?묒슜 ??
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
                "tolerance": None,  # ?곹샇?묒슜 ??? VIF 怨꾩궛 ?쒖쇅
                "vif": None,
                "var_type": "interaction"
            })
        
        # =====================================================
        # ?뚭????앹꽦
        # =====================================================
        equation_parts = [f"{round(model.params[const_col], 4)} 횞 ?곸닔??]
        for var in all_analysis_vars:
            coef = model.params[var]
            sign = "+" if coef >= 0 else "-"
            equation_parts.append(f"{sign} {abs(round(coef, 4))} 횞 {var}")
        
        regression_equation = f"Y = " + " ".join(equation_parts)
        
        # =====================================================
        # ?ㅼ륫移??덉륫移?(泥?50媛?
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
        # ?곗젏???곗씠??(二쇱슂 蹂?섎퀎 X-Y 愿怨?
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
        # ?쒓굅??蹂??紐⑸줉
        # =====================================================
        all_removed_vars = removed_by_vif + removed_by_pvalue
        
        # =====================================================
        # 寃곌낵 ?댁꽍 ?앹꽦
        # =====================================================
        interpretation = generate_interpretation(
            model, coefficients, all_removed_vars, vif_dict,
            final_main_vars, interaction_terms, residual_stats
        )
        
        # =====================================================
        # 寃곌낵 諛섑솚
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
            
            # ?뚭???
            "regression_equation": regression_equation,
            
            # 紐⑤뜽 ?붿빟
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
            
            # ANOVA ?뚯씠釉?
            "anova_table": anova_table,
            
            # 怨꾩닔
            "coefficients": coefficients,
            
            # 湲곗닠?듦퀎??(Q1, Q3 ?ы븿)
            "descriptive_stats": descriptive_stats,
            
            # ?곴??됰젹
            "correlation_matrix": correlation_matrix,
            
            # ?붿감 吏꾨떒 (Jarque-Bera, ?댁긽移??ы븿)
            "residual_stats": residual_stats,
            
            # ?ㅼ륫移??덉륫移?
            "actual_vs_predicted": actual_vs_predicted,
            
            # ?곗젏???곗씠??
            "scatter_data": scatter_data,
            
            # ?댁꽍
            "interpretation": interpretation
        }
        
        return result
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": f"遺꾩꽍 以??ㅻ쪟 諛쒖깮: {str(e)}"}


def generate_interpretation(model, coefficients: List[Dict], removed_vars: List[str],
                           vif_dict: Dict, final_main_vars: List[str], 
                           interaction_terms: List[str], residual_stats: Dict) -> str:
    """
    ?뚭?遺꾩꽍 寃곌낵 ?댁꽍 ?앹꽦
    
    Args:
        model: ?뚭? 紐⑤뜽
        coefficients: 怨꾩닔 ?뺣낫
        removed_vars: ?쒓굅??蹂??
        vif_dict: VIF ?뺤뀛?덈━
        final_main_vars: 理쒖쥌 二쇳슚怨?蹂??
        interaction_terms: ?곹샇?묒슜 ??
        residual_stats: ?붿감 ?듦퀎
    
    Returns:
        ?댁꽍 臾몄옄??
    """
    interpretation = []
    
    adj_r2 = model.rsquared_adj
    
    # 1. 紐⑤뜽 ?곹빀??
    if adj_r2 >= 0.7:
        interpretation.append(f"紐⑤뜽???ㅻ챸?μ씠 留ㅼ슦 ?믪뒿?덈떎 (Adjusted R짼 = {adj_r2:.3f}).")
    elif adj_r2 >= 0.5:
        interpretation.append(f"紐⑤뜽???ㅻ챸?μ씠 ?묓샇?⑸땲??(Adjusted R짼 = {adj_r2:.3f}).")
    else:
        interpretation.append(f"紐⑤뜽???ㅻ챸?μ씠 ??뒿?덈떎 (Adjusted R짼 = {adj_r2:.3f}). 異붽? 蹂?섍? ?꾩슂?????덉뒿?덈떎.")
    
    # 2. ?좎쓽??二쇳슚怨?
    significant_main = [c for c in coefficients 
                       if c.get('var_type') == 'main' and c['p_value'] < 0.05]
    if significant_main:
        var_names = ', '.join([v['variable'] for v in significant_main])
        interpretation.append(f"?좎쓽??二쇳슚怨?main effect): {var_names}.")
    
    # 3. ?좎쓽???곹샇?묒슜 ?④낵
    significant_interaction = [c for c in coefficients 
                              if c.get('var_type') == 'interaction' and c['p_value'] < 0.05]
    if significant_interaction:
        int_names = ', '.join([v['variable'] for v in significant_interaction])
        interpretation.append(f"?좎쓽???곹샇?묒슜 (interaction effect): {int_names}. 蹂?섎뱾 議곗젅?④낵媛 ?덉쓬???섎??⑸땲??")
    
    # 4. ?쒓굅??蹂??
    if removed_vars:
        removed = ', '.join(removed_vars)
        interpretation.append(f"?쒓굅??蹂?? {removed}.")
    
    # 5. ?ㅼ쨷怨듭꽑??寃??
    if vif_dict and len(vif_dict) > 0:
        max_vif = max(vif_dict.values())
        if max_vif < 5:
            interpretation.append("?ㅼ쨷怨듭꽑??臾몄젣媛 ?놁뒿?덈떎 (紐⑤뱺 VIF < 5).")
        elif max_vif < 10:
            interpretation.append("?ㅼ쨷怨듭꽑?깆씠 ?덉쑝???덉슜 媛?ν븳 ?섏??낅땲??(VIF < 10).")
    
    # 6. ?붿감 ?뺢퇋??寃??
    jb_pvalue = residual_stats.get('jarque_bera_pvalue', 1.0)
    if jb_pvalue > 0.05:
        interpretation.append(f"?붿감媛 ?뺢퇋遺꾪룷瑜??곕쫭?덈떎 (Jarque-Bera p = {jb_pvalue:.4f}).")
    else:
        interpretation.append(f"?좑툘 ?붿감媛 ?뺢퇋遺꾪룷瑜??곕Ⅴ吏 ?딆뒿?덈떎 (Jarque-Bera p = {jb_pvalue:.4f}).")
    
    # 7. ?먭린?곴? 寃??
    dw = residual_stats.get('durbin_watson', 2.0)
    if 1.5 <= dw <= 2.5:
        interpretation.append(f"?먭린?곴? 臾몄젣媛 ?놁뒿?덈떎 (Durbin-Watson = {dw:.4f}).")
    else:
        interpretation.append(f"?좑툘 ?먭린?곴? 臾몄젣媛 ?덉쓣 ???덉뒿?덈떎 (Durbin-Watson = {dw:.4f}).")
    
    # 8. ?댁긽移?
    outliers = residual_stats.get('outliers_count', 0)
    if outliers > 0:
        interpretation.append(f"?좑툘 ?댁긽移?{outliers}媛?諛쒓껄 ({residual_stats.get('outliers_percent', 0):.2f}%).")
    
    # 9. F-?듦퀎??
    if model.f_pvalue < 0.001:
        interpretation.append("紐⑤뜽???듦퀎?곸쑝濡?留ㅼ슦 ?좎쓽?⑸땲??(p < 0.001).")
    elif model.f_pvalue < 0.05:
        interpretation.append("紐⑤뜽???듦퀎?곸쑝濡??좎쓽?⑸땲??(p < 0.05).")
    
    return ' '.join(interpretation)


def calculate_interaction_effects(data: List[Dict],
                                   dependent_var: str,
                                   independent_vars: List[str]) -> Dict[str, Any]:
    """
    ?곹샇?묒슜 ?④낵 怨꾩궛 (蹂꾨룄 遺꾩꽍??
    
    Args:
        data: ?곗씠??紐⑸줉
        dependent_var: 醫낆냽蹂??
        independent_vars: ?낅┰蹂??紐⑸줉
    
    Returns:
        ?곹샇?묒슜 ?④낵 寃곌낵
    """
    try:
        df = pd.DataFrame(data)
        
        # ?レ옄??蹂??
        all_vars = [dependent_var] + independent_vars
        for col in all_vars:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
        df = df.dropna()
        
        if len(independent_vars) < 2:
            return {"interactions": []}
        
        interactions = []
        
        # 2-way ?곹샇?묒슜留?怨꾩궛
        for i in range(len(independent_vars)):
            for j in range(i + 1, len(independent_vars)):
                var1 = independent_vars[i]
                var2 = independent_vars[j]
                
                # ?곹샇?묒슜 ???앹꽦
                interaction_name = f"{var1}횞{var2}"
                df[interaction_name] = df[var1] * df[var2]
                
                # ?곹샇?묒슜 紐⑤뜽
                X_interaction = sm.add_constant(df[[var1, var2, interaction_name]], has_constant='add')
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
