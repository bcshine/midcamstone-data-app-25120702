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
    // schema.table 형식 지원
    if (!/^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)?$/.test(tableName)) {
      return NextResponse.json(
        { error: "잘못된 테이블명입니다." },
        { status: 400 }
      );
    }

    // schema.table 형식 파싱
    const [schema, table] = tableName.includes('.') 
      ? tableName.split('.') 
      : ['public', tableName];

    // get_table_data 함수를 통해 데이터 조회 (커스텀 Schema 지원)
    const { data: result, error } = await supabase.rpc("get_table_data", {
      p_schema: schema,
      p_table: table,
      p_limit: pageSize,
      p_offset: offset
    });

    if (error) {
      console.error("데이터 조회 오류:", error);
      return NextResponse.json(
        { error: `데이터 조회 실패: ${error.message}` },
        { status: 500 }
      );
    }

    const data = result?.data || [];
    const count = result?.totalCount || 0;

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






