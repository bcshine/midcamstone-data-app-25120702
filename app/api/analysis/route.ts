// =====================================================
// 회귀분석 API 프록시
// Python FastAPI 서버로 요청을 전달합니다.
// =====================================================

import { NextResponse } from "next/server";

// Python API 서버 URL
const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://localhost:8000";

/**
 * POST: 회귀분석 실행
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const { action, ...params } = body;

    // 액션에 따라 다른 엔드포인트 호출
    let endpoint = "/regression";
    
    if (action === "descriptive") {
      endpoint = "/descriptive";
    } else if (action === "correlation") {
      endpoint = "/correlation";
    } else if (action === "interaction") {
      endpoint = "/interaction";
    }

    // Python API로 요청 전달
    const response = await fetch(`${PYTHON_API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || "분석 중 오류가 발생했습니다." },
        { status: response.status }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error("분석 API 오류:", error);
    
    // Python 서버 연결 실패
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return NextResponse.json(
        { error: "분석 서버에 연결할 수 없습니다. Python 서버가 실행 중인지 확인해주세요." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "분석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * GET: 서버 상태 확인
 */
export async function GET() {
  try {
    const response = await fetch(`${PYTHON_API_URL}/health`);
    
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
    return NextResponse.json(
      { status: "disconnected", message: "Python 서버에 연결할 수 없습니다." },
      { status: 503 }
    );
  }
}

