# =====================================================
# FastAPI 회귀분석 서버
# 다중회귀분석 및 통계 분석 API 제공
# =====================================================

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn

from regression import (
    run_regression,
    run_lasso_regression,
    calculate_descriptive_stats,
    calculate_correlation_matrix,
    calculate_interaction_effects
)

# FastAPI 앱 생성
app = FastAPI(
    title="회귀분석 API",
    description="다중회귀분석 및 통계 분석 서비스",
    version="1.0.0"
)

# CORS 설정 (Next.js에서 접근 허용)
# 환경 변수에서 허용된 오리진 가져오기
allowed_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
origins_list = [origin.strip() for origin in allowed_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================
# 요청/응답 모델 정의
# =====================================================

class RegressionRequest(BaseModel):
    """회귀분석 요청 모델"""
    data: List[Dict[str, Any]]  # 데이터 목록
    dependent_var: str          # 종속변수
    independent_vars: List[str] # 독립변수 목록
    method: str = "enter"       # "enter", "stepwise", 또는 "lasso"


class DescriptiveRequest(BaseModel):
    """기술통계 요청 모델"""
    data: List[Dict[str, Any]]
    columns: List[str]


class CorrelationRequest(BaseModel):
    """상관분석 요청 모델"""
    data: List[Dict[str, Any]]
    columns: List[str]


class InteractionRequest(BaseModel):
    """상호작용 효과 요청 모델"""
    data: List[Dict[str, Any]]
    dependent_var: str
    independent_vars: List[str]


# =====================================================
# API 엔드포인트
# =====================================================

@app.get("/")
async def root():
    """서버 상태 확인"""
    return {
        "status": "running",
        "message": "회귀분석 API 서버가 실행 중입니다.",
        "endpoints": [
            "/regression - 다중회귀분석",
            "/descriptive - 기술통계량",
            "/correlation - 상관분석",
            "/interaction - 상호작용효과"
        ]
    }


@app.get("/health")
async def health_check():
    """헬스 체크 엔드포인트"""
    return {"status": "healthy"}


@app.post("/regression")
async def regression_analysis(request: RegressionRequest):
    """
    다중회귀분석 실행
    
    - Enter 방식: 모든 독립변수 포함
    - Stepwise 방식: 단계적 변수 선택
    - Lasso 방식: L1 정규화로 중요 변수 자동 선택
    """
    # 유효성 검사
    if not request.data:
        raise HTTPException(status_code=400, detail="데이터가 없습니다.")
    
    if not request.dependent_var:
        raise HTTPException(status_code=400, detail="종속변수를 지정해주세요.")
    
    if not request.independent_vars or len(request.independent_vars) == 0:
        raise HTTPException(status_code=400, detail="독립변수를 하나 이상 선택해주세요.")
    
    if request.method not in ["enter", "stepwise", "lasso"]:
        raise HTTPException(status_code=400, detail="method는 'enter', 'stepwise', 또는 'lasso'여야 합니다.")
    
    # Lasso 회귀분석
    if request.method == "lasso":
        result = run_lasso_regression(
            data=request.data,
            dependent_var=request.dependent_var,
            independent_vars=request.independent_vars
        )
    else:
        # Enter 또는 Stepwise 회귀분석
        result = run_regression(
            data=request.data,
            dependent_var=request.dependent_var,
            independent_vars=request.independent_vars,
            method=request.method
        )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@app.post("/descriptive")
async def descriptive_statistics(request: DescriptiveRequest):
    """기술통계량 계산"""
    import pandas as pd
    
    if not request.data:
        raise HTTPException(status_code=400, detail="데이터가 없습니다.")
    
    df = pd.DataFrame(request.data)
    result = calculate_descriptive_stats(df, request.columns)
    
    return {"descriptive_stats": result}


@app.post("/correlation")
async def correlation_analysis(request: CorrelationRequest):
    """상관분석 실행"""
    import pandas as pd
    
    if not request.data:
        raise HTTPException(status_code=400, detail="데이터가 없습니다.")
    
    df = pd.DataFrame(request.data)
    result = calculate_correlation_matrix(df, request.columns)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@app.post("/interaction")
async def interaction_analysis(request: InteractionRequest):
    """상호작용 효과 분석"""
    if not request.data:
        raise HTTPException(status_code=400, detail="데이터가 없습니다.")
    
    result = calculate_interaction_effects(
        data=request.data,
        dependent_var=request.dependent_var,
        independent_vars=request.independent_vars
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


# =====================================================
# 서버 실행
# =====================================================

if __name__ == "__main__":
    print("=" * 50)
    print("회귀분석 API 서버 시작")
    print("URL: http://localhost:8000")
    print("문서: http://localhost:8000/docs")
    print("=" * 50)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True  # 개발 중 자동 재시작
    )



