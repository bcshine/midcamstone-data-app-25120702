"use client";

// =====================================================
// 인증 보호 컴포넌트
// 로그인 여부와 역할을 확인하여 페이지 접근을 제어합니다.
// =====================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, getUserRole, type UserRole } from "../lib/auth";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];  // 허용된 역할 목록 (비어있으면 로그인만 확인)
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        // 로그인 여부 확인
        const user = await getCurrentUser();

        if (!user) {
          // 로그인 안 됨 → 로그인 페이지로
          router.push("/login");
          return;
        }

        // 역할 확인이 필요한 경우
        if (allowedRoles && allowedRoles.length > 0) {
          const roleInfo = await getUserRole();

          if (!roleInfo) {
            // 역할 없음 → 로그인 페이지로
            router.push("/login");
            return;
          }

          if (!allowedRoles.includes(roleInfo.role)) {
            // 권한 없음 → 역할에 따라 리다이렉트
            if (roleInfo.role === "client") {
              router.push("/upload");  // 고객사는 업로드 페이지로
            } else {
              router.push("/");  // 관리자는 홈으로
            }
            return;
          }
        }

        // 인증 및 권한 확인 완료
        setIsAuthorized(true);

      } catch (error) {
        console.error("인증 확인 오류:", error);
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [router, allowedRoles]);

  // 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
          <p className="mt-4 text-slate-400">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  // 권한 없음 (리다이렉트 중)
  if (!isAuthorized) {
    return null;
  }

  // 인증됨 → 페이지 표시
  return <>{children}</>;
}

