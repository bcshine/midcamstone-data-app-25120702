// =====================================================
// 테이블 데이터 조회 API
// 특정 테이블의 데이터를 페이지네이션하여 조회합니다.
// =====================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/tables/[table]
 * 테이블 데이터를 조회합니다.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table: tableName } = await params;
    
    // URL에서 페이지 파라미터 추출
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "50");
    
    // 오프셋 계산
    const offset = (page - 1) * pageSize;

    // 테이블명 유효성 검사 (SQL 인젝션 방지)
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return NextResponse.json(
        { error: "잘못된 테이블명입니다." },
        { status: 400 }
      );
    }

    // 데이터 조회 (exec_sql 사용)
    const { data: queryResult, error: queryError } = await supabase.rpc("exec_sql", {
      sql: `SELECT * FROM public."${tableName}" ORDER BY id LIMIT ${pageSize} OFFSET ${offset};`
    });

    // exec_sql은 결과를 반환하지 않으므로, 다른 방식 사용
    // Supabase의 from()을 사용하되, 스키마 캐시 문제가 있을 수 있음
    // 직접 REST API 호출 또는 다른 방식 필요

    // 대안: Supabase에서 직접 조회 시도
    const { data, error, count } = await supabase
      .from(tableName)
      .select("*", { count: "exact" })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("데이터 조회 오류:", error);
      return NextResponse.json(
        { error: `데이터 조회 실패: ${error.message}` },
        { status: 500 }
      );
    }

    // 컬럼 정보 추출
    const columns = data && data.length > 0 ? Object.keys(data[0]) : [];

    return NextResponse.json({
      success: true,
      tableName,
      columns,
      rows: data || [],
      pagination: {
        page,
        pageSize,
        totalRows: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("서버 오류:", errorMessage);
    
    return NextResponse.json(
      { error: `서버 오류: ${errorMessage}` },
      { status: 500 }
    );
  }
}






