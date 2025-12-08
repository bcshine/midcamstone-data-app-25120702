// =====================================================
// 고객사 목록 API
// upload_logs 테이블에서 고유한 회사명 목록을 조회합니다.
// =====================================================

import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// 런타임에 Supabase 클라이언트 생성 (Service Role Key 필수)
function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase 환경 변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
  }
  
  return createClient(url, serviceRoleKey);
}

/**
 * GET /api/admin/companies
 * 고객사 목록을 조회합니다.
 */
export async function GET() {
  try {
    const supabase = getSupabase();
    // upload_logs에서 회사별 통계 조회
    const { data, error } = await supabase
      .from("upload_logs")
      .select("company_name, table_name, row_count, uploaded_at, file_name, file_date")
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error("조회 오류:", error);
      return NextResponse.json(
        { error: `데이터 조회 실패: ${error.message}` },
        { status: 500 }
      );
    }

    // 회사별로 그룹화
    const companiesMap = new Map<string, {
      companyName: string;
      fileCount: number;
      totalRows: number;
      lastUpload: string;
      tables: Array<{
        tableName: string;
        fileName: string;
        fileDate: string;
        rowCount: number;
        uploadedAt: string;
      }>;
    }>();

    for (const row of data || []) {
      const existing = companiesMap.get(row.company_name);
      
      const tableInfo = {
        tableName: row.table_name,
        fileName: row.file_name,
        fileDate: row.file_date,
        rowCount: row.row_count,
        uploadedAt: row.uploaded_at,
      };

      if (existing) {
        existing.fileCount += 1;
        existing.totalRows += row.row_count || 0;
        existing.tables.push(tableInfo);
      } else {
        companiesMap.set(row.company_name, {
          companyName: row.company_name,
          fileCount: 1,
          totalRows: row.row_count || 0,
          lastUpload: row.uploaded_at,
          tables: [tableInfo],
        });
      }
    }

    // Map을 배열로 변환
    const companies = Array.from(companiesMap.values());

    return NextResponse.json({
      success: true,
      companies,
      totalCompanies: companies.length,
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






