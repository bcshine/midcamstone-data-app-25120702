// =====================================================
// 회귀분석 API 프록시
// Python FastAPI 서버로 요청을 전달합니다.
// =====================================================

import { NextResponse } from "next/server";

// Python API 서버 URL
const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://localhost:8000";

// 요청 타임아웃 (60초 - 대용량 데이터 분석 고려)
const REQUEST_TIMEOUT = 60000;

/**
 * POST: 회귀분석 실행
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const { action, ...params } = body;

    // 액션에 따라 다른 엔드포인트 호출
    let endpoint = "/api/regression";
    
    if (action === "descriptive") {
      endpoint = "/api/descriptive";
    } else if (action === "correlation") {
      endpoint = "/api/correlation";
    } else if (action === "interaction") {
      endpoint = "/api/interactions";
    }

    // 타임아웃이 있는 AbortController 생성
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      // Python API로 요청 전달
      const response = await fetch(`${PYTHON_API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // JSON 파싱 시도
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error("JSON 파싱 오류:", jsonError);
        return NextResponse.json(
          { error: "서버 응답을 처리할 수 없습니다. Python 서버 로그를 확인해주세요." },
          { status: 500 }
        );
      }

      if (!response.ok) {
        // Python 서버에서 반환한 에러 메시지 추출
        const errorMessage = data.detail || data.error || "분석 중 오류가 발생했습니다.";
        return NextResponse.json(
          { error: errorMessage },
          { status: response.status }
        );
      }

      return NextResponse.json(data);

    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }

  } catch (error) {
    console.error("분석 API 오류:", error);
    
    // 타임아웃 오류
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "분석 요청 시간이 초과되었습니다. 데이터 크기를 줄이거나 변수를 적게 선택해주세요." },
        { status: 504 }
      );
    }
    
    // Python 서버 연결 실패
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return NextResponse.json(
        { error: "분석 서버에 연결할 수 없습니다. Python 서버가 실행 중인지 확인해주세요." },
        { status: 503 }
      );
    }
    
    // 연결 거부 에러
    if (error instanceof Error && error.message.includes("ECONNREFUSED")) {
      return NextResponse.json(
        { error: "Python 분석 서버가 실행되지 않았습니다. 서버를 시작해주세요." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "분석 중 알 수 없는 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * GET: 서버 상태 확인
 */
export async function GET() {
  try {
    // 헬스체크용 타임아웃 (5초)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${PYTHON_API_URL}/health`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      return NextResponse.json({
        status: "connected",
        message: "Python 분석 서버에 연결되었습니다.",
      });
    }

    return NextResponse.json(
      { status: "disconnected", message: "Python 서버가 응답하지 않습니다." },
      { status: 503 }
    );

  } catch (error) {
    // 타임아웃인 경우
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { status: "disconnected", message: "Python 서버 응답 시간 초과." },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { status: "disconnected", message: "Python 서버에 연결할 수 없습니다." },
      { status: 503 }
    );
  }
}


