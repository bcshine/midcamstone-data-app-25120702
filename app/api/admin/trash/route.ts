// =====================================================
// 휴지통 API
// 휴지통 목록 조회, 복원, 완전 삭제 기능
// =====================================================

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

// GET: 휴지통 목록 조회
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("deleted_tables")
      .select("*")
      .order("deleted_at", { ascending: false });

    if (error) {
      console.error("휴지통 조회 오류:", error);
      return NextResponse.json(
        { error: "휴지통 조회 실패" },
        { status: 500 }
      );
    }

    // 남은 일수 계산
    const itemsWithDays = (data || []).map((item) => {
      const expiresAt = new Date(item.expires_at);
      const now = new Date();
      const diffTime = expiresAt.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        ...item,
        daysLeft: Math.max(0, daysLeft),
      };
    });

    return NextResponse.json({ items: itemsWithDays });
  } catch (error) {
    console.error("휴지통 조회 오류:", error);
    return NextResponse.json(
      { error: "휴지통 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST: 테이블 복원
export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 1. 휴지통에서 테이블 정보 가져오기
    const { data: trashItem, error: fetchError } = await supabase
      .from("deleted_tables")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !trashItem) {
      return NextResponse.json(
        { error: "휴지통 항목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 2. 테이블 재생성 및 데이터 복원
    if (trashItem.original_data && Array.isArray(trashItem.original_data) && trashItem.original_data.length > 0) {
      // 첫 번째 행에서 컬럼 정보 추출
      const firstRow = trashItem.original_data[0];
      const columns = Object.keys(firstRow);

      // 컬럼 타입 추론 (간단하게 숫자/텍스트만 구분)
      const columnDefs = columns.map((col) => {
        const value = firstRow[col];
        if (col === "id") return `"${col}" SERIAL PRIMARY KEY`;
        if (typeof value === "number") return `"${col}" NUMERIC`;
        return `"${col}" TEXT`;
      });

      // 테이블 생성
      const createTableSQL = `CREATE TABLE IF NOT EXISTS "${trashItem.table_name}" (${columnDefs.join(", ")});`;
      const { error: createError } = await supabase.rpc("exec_sql", {
        sql: createTableSQL,
      });

      if (createError) {
        console.error("테이블 생성 오류:", createError);
        return NextResponse.json(
          { error: `테이블 복원 실패: ${createError.message}` },
          { status: 500 }
        );
      }

      // 데이터 삽입 (id 컬럼 제외)
      const dataColumns = columns.filter((col) => col !== "id");
      for (const row of trashItem.original_data) {
        const values = dataColumns.map((col) => {
          const val = row[col];
          if (val === null || val === undefined) return "NULL";
          if (typeof val === "number") return val;
          return `'${String(val).replace(/'/g, "''")}'`;
        });

        const insertSQL = `INSERT INTO "${trashItem.table_name}" (${dataColumns.map((c) => `"${c}"`).join(", ")}) VALUES (${values.join(", ")});`;
        await supabase.rpc("exec_sql", { sql: insertSQL });
      }
    }

    // 3. upload_logs에 다시 추가
    const { error: logError } = await supabase.from("upload_logs").insert({
      company_name: trashItem.company_name,
      file_name: trashItem.file_name,
      file_date: trashItem.file_date,
      table_name: trashItem.table_name,
      row_count: trashItem.row_count,
    });

    if (logError) {
      console.error("로그 복원 오류:", logError);
    }

    // 4. 휴지통에서 삭제
    await supabase.from("deleted_tables").delete().eq("id", id);

    return NextResponse.json({
      success: true,
      message: `"${trashItem.table_name}" 테이블이 복원되었습니다.`,
    });
  } catch (error) {
    console.error("복원 처리 오류:", error);
    return NextResponse.json(
      { error: "복원 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// DELETE: 완전 삭제 (휴지통에서 영구 삭제)
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 휴지통에서 삭제
    const { data: deletedItem, error } = await supabase
      .from("deleted_tables")
      .delete()
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "삭제 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `"${deletedItem?.table_name}" 테이블이 완전히 삭제되었습니다.`,
    });
  } catch (error) {
    console.error("완전 삭제 오류:", error);
    return NextResponse.json(
      { error: "완전 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

