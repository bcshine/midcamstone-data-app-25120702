// =====================================================
// 초기 설정 API
// 관리자 계정 생성용 (한 번만 실행)
// =====================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Service Role을 사용하는 관리자 Supabase 클라이언트
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(req: Request) {
  try {
    const { email, password, role } = await req.json();

    // 기본값 설정
    const adminEmail = email || "admin@baroedu.com";
    const adminPassword = password || "1234";
    const userRole = role || "admin";

    // 1. 기존 사용자 확인 (이메일로 조회)
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === adminEmail);

    if (existingUser) {
      // 이미 존재하는 경우 - 역할만 확인/업데이트
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("*")
        .eq("user_id", existingUser.id)
        .single();

      if (!existingRole) {
        // 역할이 없으면 추가
        await supabaseAdmin.from("user_roles").insert({
          user_id: existingUser.id,
          role: userRole,
          company_name: null,
        });
      }

      return NextResponse.json({
        success: true,
        message: `사용자가 이미 존재합니다: ${adminEmail}`,
        userId: existingUser.id,
      });
    }

    // 2. 새 사용자 생성
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // 이메일 인증 자동 완료
    });

    if (createError) {
      console.error("사용자 생성 오류:", createError);
      return NextResponse.json(
        { error: `사용자 생성 실패: ${createError.message}` },
        { status: 500 }
      );
    }

    // 3. 역할 추가
    if (newUser.user) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: newUser.user.id,
          role: userRole,
          company_name: null,
        });

      if (roleError) {
        console.error("역할 설정 오류:", roleError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${userRole} 계정이 생성되었습니다!`,
      email: adminEmail,
      userId: newUser.user?.id,
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("설정 오류:", errorMessage);

    return NextResponse.json(
      { error: `설정 오류: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// GET: 현재 설정 상태 확인
export async function GET() {
  try {
    // 관리자 수 확인
    const { data: adminRoles, error } = await supabaseAdmin
      .from("user_roles")
      .select("*")
      .eq("role", "admin");

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      adminCount: adminRoles?.length || 0,
      message: adminRoles?.length 
        ? `${adminRoles.length}명의 관리자가 있습니다.`
        : "관리자 계정이 없습니다. POST 요청으로 생성하세요.",
    });

  } catch (err) {
    return NextResponse.json(
      { error: "상태 확인 실패" },
      { status: 500 }
    );
  }
}


