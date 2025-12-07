// =====================================================
// CSV 업로드 API
// CSV 파일을 받아서 Supabase에 회사별 테이블로 저장합니다.
// =====================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// CSV 파싱 유틸리티
import { csvToJsonArray } from "../../../utils/csvParser";

// 파일명 파싱 유틸리티
import { parseFileName } from "../../../utils/filenameParser";

// Supabase 클라이언트 생성 (Service Role Key 사용)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/upload
 * CSV 파일을 업로드하고 Supabase에 저장합니다.
 */
export async function POST(req: Request) {
  try {
    // 1. FormData에서 파일 추출
    const formData = await req.formData();
    const file = formData.get("file") as File;

    // 파일 존재 여부 확인
    if (!file) {
      return NextResponse.json(
        { error: "파일이 없습니다. CSV 파일을 선택해주세요." },
        { status: 400 }
      );
    }

    // 2. 파일명 파싱 및 검증
    const fileName = file.name;
    const parseResult = parseFileName(fileName);

    // 파일명 형식이 올바르지 않으면 오류 반환
    if (!parseResult.isValid) {
      return NextResponse.json(
        { error: parseResult.errorMessage },
        { status: 400 }
      );
    }

    const { companyName, fileDate, tableName } = parseResult;

    // 3. CSV 파일 읽기 및 JSON 변환
    const csvText = await file.text();
    const rows = csvToJsonArray(csvText);

    // 데이터가 없으면 오류 반환
    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "CSV 파일에 데이터가 없습니다. 헤더와 데이터 행이 있는지 확인해주세요." },
        { status: 400 }
      );
    }

    // 4. CSV 헤더(컬럼명) 추출
    const columns = Object.keys(rows[0]);

    // 컬럼명 유효성 검사 및 정리
    const sanitizedColumns = columns.map((col) => sanitizeColumnName(col));

    // 5. 기존 테이블 삭제 (같은 이름이 있으면 덮어쓰기)
    const dropTableSql = `DROP TABLE IF EXISTS public."${tableName}";`;
    await supabase.rpc("exec_sql", { sql: dropTableSql });

    // 6. CREATE TABLE SQL 생성
    // 모든 컬럼은 TEXT 타입으로 생성 (유연성을 위해)
    let createTableSql = `CREATE TABLE public."${tableName}" (\n`;
    createTableSql += `  id BIGSERIAL PRIMARY KEY,\n`;  // 자동 증가 ID 추가

    sanitizedColumns.forEach((col, index) => {
      createTableSql += `  "${col}" TEXT`;
      if (index < sanitizedColumns.length - 1) {
        createTableSql += ",";
      }
      createTableSql += "\n";
    });

    createTableSql += ");";

    // 7. 테이블 생성 (exec_sql RPC 함수 사용)
    const { error: createError } = await supabase.rpc("exec_sql", {
      sql: createTableSql,
    });

    if (createError) {
      console.error("테이블 생성 오류:", createError);
      return NextResponse.json(
        { error: `테이블 생성 실패: ${createError.message}` },
        { status: 500 }
      );
    }

    // 8. RLS 활성화 및 정책 설정
    const rlsSql = `
      ALTER TABLE public."${tableName}" ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "${tableName}_select_policy" ON public."${tableName}";
      CREATE POLICY "${tableName}_select_policy" 
        ON public."${tableName}" FOR SELECT USING (true);
      
      DROP POLICY IF EXISTS "${tableName}_insert_policy" ON public."${tableName}";
      CREATE POLICY "${tableName}_insert_policy" 
        ON public."${tableName}" FOR INSERT WITH CHECK (true);
    `;

    await supabase.rpc("exec_sql", { sql: rlsSql });

    // 9. 데이터 삽입 (exec_sql을 통해 직접 SQL 실행)
    const BATCH_SIZE = 100;  // 한 번에 삽입할 행 수 (SQL 문자열 길이 제한 고려)
    let insertedCount = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      
      // INSERT SQL 생성
      const insertSql = generateInsertSQL(tableName, sanitizedColumns, columns, batch);
      
      const { error: insertError } = await supabase.rpc("exec_sql", {
        sql: insertSql,
      });

      if (insertError) {
        console.error("데이터 삽입 오류:", insertError);
        return NextResponse.json(
          { error: `데이터 삽입 실패 (${insertedCount}행 삽입 후): ${insertError.message}` },
          { status: 500 }
        );
      }

      insertedCount += batch.length;
    }

    // 10. upload_logs 테이블에 업로드 내역 기록
    const { error: logError } = await supabase
      .from("upload_logs")
      .insert({
        company_name: companyName,
        file_name: fileName,
        table_name: tableName,
        row_count: rows.length,
        file_date: fileDate,
      });

    // 로그 기록 실패는 경고만 출력 (업로드 자체는 성공)
    if (logError) {
      console.warn("업로드 로그 기록 실패:", logError.message);
    }

    // 11. 성공 응답 반환
    return NextResponse.json({
      success: true,
      message: "CSV 업로드 완료!",
      companyName,
      tableName,
      rowCount: rows.length,
      columns: sanitizedColumns,
      fileDate,
    });

  } catch (err: unknown) {
    // 예외 처리
    const errorMessage = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("서버 오류:", errorMessage);
    
    return NextResponse.json(
      { error: `서버 오류: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * INSERT SQL 문을 생성합니다.
 * 
 * @param tableName - 테이블명
 * @param sanitizedColumns - 정리된 컬럼명 배열
 * @param originalColumns - 원본 컬럼명 배열
 * @param rows - 삽입할 데이터 배열
 * @returns INSERT SQL 문자열
 */
function generateInsertSQL(
  tableName: string,
  sanitizedColumns: string[],
  originalColumns: string[],
  rows: Record<string, string>[]
): string {
  // 컬럼 목록 생성
  const columnList = sanitizedColumns.map(col => `"${col}"`).join(", ");
  
  // VALUES 절 생성
  const valuesList = rows.map(row => {
    const values = originalColumns.map(originalCol => {
      const value = row[originalCol] ?? "";
      // SQL 인젝션 방지를 위해 값 이스케이프
      const escapedValue = value.replace(/'/g, "''");
      return `'${escapedValue}'`;
    });
    return `(${values.join(", ")})`;
  });

  return `INSERT INTO public."${tableName}" (${columnList}) VALUES ${valuesList.join(", ")};`;
}

/**
 * 컬럼명을 PostgreSQL에서 사용 가능한 형태로 정리합니다.
 * - 공백, 특수문자를 언더스코어로 변환
 * - 한글은 그대로 유지 (PostgreSQL은 한글 컬럼명 지원)
 * 
 * @param columnName - 원본 컬럼명
 * @returns 정리된 컬럼명
 */
function sanitizeColumnName(columnName: string): string {
  return columnName
    .trim()
    .replace(/\s+/g, "_")           // 공백 → 언더스코어
    .replace(/[^\w가-힣]/g, "_")    // 영문, 숫자, 한글 외 → 언더스코어
    .replace(/_+/g, "_")            // 연속 언더스코어 제거
    .replace(/^_|_$/g, "");         // 앞뒤 언더스코어 제거
}
