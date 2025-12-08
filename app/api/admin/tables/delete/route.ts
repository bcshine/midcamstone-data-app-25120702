// =====================================================
// 테이블 삭제 API (휴지통으로 이동)
// 테이블을 휴지통으로 이동시키고 30일 후 자동 삭제됩니다.
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../../lib/supabase";

export async function DELETE(request: NextRequest) {
  try {
    // 요청 본문에서 테이블명 가져오기
    const { tableName } = await request.json();

    if (!tableName) {
      return NextResponse.json(
        { error: "테이블명이 필요합니다." },
        { status: 400 }
      );
    }

    // 테이블명 검증 (SQL 인젝션 방지)
    // schema.table 형식 지원 (예: test.sales_251208_105413)
    if (!/^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)?$/.test(tableName)) {
      return NextResponse.json(
        { error: "유효하지 않은 테이블명입니다." },
        { status: 400 }
      );
    }

    // schema.table 형식 파싱
    const [schema, table] = tableName.includes('.') 
      ? tableName.split('.') 
      : ['public', tableName];

    // 1. upload_logs에서 테이블 정보 가져오기
    const { data: logData, error: logFetchError } = await supabase
      .from("upload_logs")
      .select("*")
      .eq("table_name", tableName)
      .single();

    if (logFetchError) {
      console.error("로그 조회 오류:", logFetchError);
    }

    // 2. 테이블의 모든 데이터 가져오기 (백업용)
    const { data: tableData, error: dataError } = await supabase.rpc("exec_sql", {
      sql: `SELECT json_agg(t) as data FROM ${schema}."${table}" t;`,
    });

    let originalData = null;
    if (!dataError && tableData && tableData.length > 0) {
      originalData = tableData[0]?.data || null;
    }

    // 3. 휴지통에 테이블 정보 저장
    const { error: trashError } = await supabase
      .from("deleted_tables")
      .insert({
        table_name: tableName,
        company_name: logData?.company_name || "알 수 없음",
        file_name: logData?.file_name || tableName,
        file_date: logData?.file_date || "",
        row_count: logData?.row_count || 0,
        original_data: originalData,
      });

    if (trashError) {
      console.error("휴지통 저장 오류:", trashError);
      return NextResponse.json(
        { error: `휴지통 저장 실패: ${trashError.message}` },
        { status: 500 }
      );
    }

    // 4. 원본 테이블 삭제
    const dropTableQuery = `DROP TABLE IF EXISTS ${schema}."${table}" CASCADE;`;
    const { error: dropError } = await supabase.rpc("exec_sql", {
      sql: dropTableQuery,
    });

    if (dropError) {
      console.error("테이블 삭제 오류:", dropError);
      // 휴지통에서 다시 제거
      await supabase.from("deleted_tables").delete().eq("table_name", tableName);
      return NextResponse.json(
        { error: `테이블 삭제 실패: ${dropError.message}` },
        { status: 500 }
      );
    }

    // 5. upload_logs에서 해당 테이블 로그 삭제
    const { error: logDeleteError } = await supabase
      .from("upload_logs")
      .delete()
      .eq("table_name", tableName);

    if (logDeleteError) {
      console.error("로그 삭제 오류:", logDeleteError);
    }

    // 6. Schema에 테이블이 없으면 Schema도 삭제 (public 제외)
    if (schema !== 'public') {
      const { data: isEmpty } = await supabase.rpc("check_schema_empty", {
        p_schema: schema,
      });

      // Schema가 비어있으면 삭제
      if (isEmpty === true) {
        const dropSchemaQuery = `DROP SCHEMA IF EXISTS ${schema} CASCADE;`;
        await supabase.rpc("exec_sql", { sql: dropSchemaQuery });
        console.log(`빈 Schema '${schema}' 삭제됨`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `"${tableName}" 테이블이 휴지통으로 이동되었습니다. 30일 후 자동 삭제됩니다.`,
    });

  } catch (error) {
    console.error("삭제 처리 오류:", error);
    return NextResponse.json(
      { error: "삭제 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
