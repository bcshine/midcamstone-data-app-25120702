# =====================================================
# FastAPI 회귀분석 서버
# 
# 주요 기능:
# - 데이터 수신 및 분석 실행
# - Enter 방식 / Stepwise 방식 회귀분석
# - 2-way 상호작용 효과 자동 포함
# - VIF 기반 다중공선성 자동 제거
# - SPSS 스타일 결과 출력
# =====================================================

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import traceback

# 회귀분석 모듈 임포트
from regression import run_regression, calculate_interaction_effects

app = FastAPI(
    title="회귀분석 API 서버",
    description="다중회귀분석 API - Enter/Stepwise 방식 지원",
    version="1.0.0"
)

# CORS 설정 (프론트엔드와 통신 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 도메인 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RegressionRequest(BaseModel):
    """회귀분석 요청 데이터 모델"""
    data: List[Dict[str, Any]]
    dependent_var: str
    independent_vars: List[str]
    method: str = "enter"  # "enter" 또는 "stepwise"


class InteractionRequest(BaseModel):
    """상호작용 분석 요청 데이터 모델"""
    data: List[Dict[str, Any]]
    dependent_var: str
    independent_vars: List[str]


@app.get("/")
async def root():
    """
    서버 상태 확인
    """
    return {
        "status": "running",
        "message": "회귀분석 API 서버가 실행 중입니다.",
        "version": "1.0.0",
        "endpoints": {
            "/": "서버 상태 확인",
            "/api/regression": "회귀분석 실행 (POST)",
            "/api/interactions": "상호작용 분석 (POST)"
        }
    }


@app.get("/health")
async def health_check():
    """
    헬스 체크 엔드포인트
    """
    return {"status": "healthy"}


@app.post("/api/regression")
async def analyze_regression(request: RegressionRequest):
    """
    회귀분석 실행 API
    
    지원 방식:
    - enter: 모든 독립변수를 동시에 투입
    - stepwise: Backward Elimination (p-value > 0.05 제거)
    
    주요 기능:
    - 2-way 상호작용 효과 자동 생성
    - VIF > 10 변수 자동 제거
    - Jarque-Bera 정규성 검정
    - 이상치 분석 (표준화 잔차 > 3)
    - 사분위수 (Q1, Q3) 포함
    
    요청 본문:
    ```json
    {
        "data": [{"var1": 1, "var2": 2, "y": 10}, ...],
        "dependent_var": "y",
        "independent_vars": ["var1", "var2"],
        "method": "enter"  // 또는 "stepwise"
    }
    ```
    """
    try:
        # 요청 유효성 검사
        if not request.data:
            raise HTTPException(status_code=400, detail="데이터가 비어있습니다.")
        
        if not request.dependent_var:
            raise HTTPException(status_code=400, detail="종속변수가 지정되지 않았습니다.")
        
        if not request.independent_vars:
            raise HTTPException(status_code=400, detail="독립변수가 지정되지 않았습니다.")
        
        # 분석 방식 검증
        allowed_methods = ["enter", "stepwise"]
        if request.method not in allowed_methods:
            raise HTTPException(
                status_code=400, 
                detail=f"지원하지 않는 분석 방식입니다. 허용: {allowed_methods}"
            )
        
        print(f"\n========== 회귀분석 요청 ==========")
        print(f"데이터 수: {len(request.data)}")
        print(f"종속변수: {request.dependent_var}")
        print(f"독립변수: {request.independent_vars}")
        print(f"분석 방식: {request.method}")
        print("=" * 40)
        
        # 회귀분석 실행
        result = run_regression(
            data=request.data,
            dependent_var=request.dependent_var,
            independent_vars=request.independent_vars,
            method=request.method
        )
        
        # 오류 확인
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")


@app.post("/api/interactions")
async def analyze_interactions(request: InteractionRequest):
    """
    상호작용 효과 분석 API
    
    모든 2-way 상호작용 효과를 개별적으로 분석합니다.
    
    요청 본문:
    ```json
    {
        "data": [{"var1": 1, "var2": 2, "y": 10}, ...],
        "dependent_var": "y",
        "independent_vars": ["var1", "var2", "var3"]
    }
    ```
    """
    try:
        if not request.data:
            raise HTTPException(status_code=400, detail="데이터가 비어있습니다.")
        
        if len(request.independent_vars) < 2:
            raise HTTPException(status_code=400, detail="상호작용 분석에는 최소 2개의 독립변수가 필요합니다.")
        
        result = calculate_interaction_effects(
            data=request.data,
            dependent_var=request.dependent_var,
            independent_vars=request.independent_vars
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")


# 서버 직접 실행시
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
