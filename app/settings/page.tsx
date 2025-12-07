"use client";

// =====================================================
// 설정 페이지
// 비밀번호 변경 등 사용자 설정을 관리합니다.
// =====================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthGuard from "../../components/AuthGuard";
import { getCurrentUser, getUserRole, updatePassword, signOut, type UserRole } from "../../lib/auth";

function SettingsPageContent() {
  const router = useRouter();
  
  // 사용자 정보
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  
  // 비밀번호 변경 상태
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 사용자 정보 로드
  useEffect(() => {
    async function loadUserInfo() {
      const user = await getCurrentUser();
      if (user) {
        setUserEmail(user.email || null);
      }
      
      const roleInfo = await getUserRole();
      if (roleInfo) {
        setUserRole(roleInfo.role);
        setCompanyName(roleInfo.companyName);
      }
    }
    loadUserInfo();
  }, []);

  // 로그아웃 핸들러
  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  // 비밀번호 변경 핸들러
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // 유효성 검사
    if (newPassword !== confirmPassword) {
      setError("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    if (newPassword.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await updatePassword(newPassword);

      if (!result.success) {
        setError(result.error || "비밀번호 변경에 실패했습니다.");
      } else {
        setSuccess("비밀번호가 성공적으로 변경되었습니다!");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setError("비밀번호 변경 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8 relative">
      {/* 상단 네비게이션 */}
      <div className="absolute top-8 right-8 flex items-center gap-4">
        {userRole === "admin" && (
          <Link
            href="/"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-sm transition-colors"
          >
            관리자 홈
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-sm transition-colors"
        >
          로그아웃
        </button>
      </div>

      <div className="max-w-xl mx-auto">
        {/* 헤더 */}
        <header className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            ⚙️ 설정
          </h1>
          <p className="text-slate-400">
            계정 정보 및 비밀번호를 관리합니다
          </p>
        </header>

        {/* 사용자 정보 카드 */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">👤 내 정보</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-700">
              <span className="text-slate-400">이메일</span>
              <span className="text-white font-medium">{userEmail || "-"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-700">
              <span className="text-slate-400">역할</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                userRole === "admin" 
                  ? "bg-purple-500/20 text-purple-400" 
                  : "bg-cyan-500/20 text-cyan-400"
              }`}>
                {userRole === "admin" ? "관리자" : "고객사"}
              </span>
            </div>
            {companyName && (
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400">회사명</span>
                <span className="text-white font-medium">{companyName}</span>
              </div>
            )}
          </div>
        </div>

        {/* 비밀번호 변경 카드 */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">🔒 비밀번호 변경</h2>
          
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {/* 새 비밀번호 */}
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-slate-300 mb-2">
                새 비밀번호 (6자 이상)
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all disabled:opacity-50"
              />
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-300 mb-2">
                새 비밀번호 확인
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoading}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all disabled:opacity-50"
              />
            </div>

            {/* 성공 메시지 */}
            {success && (
              <div className="p-4 bg-emerald-900/30 border border-emerald-700 rounded-xl">
                <p className="text-emerald-400 text-sm">{success}</p>
              </div>
            )}

            {/* 에러 메시지 */}
            {error && (
              <div className="p-4 bg-red-900/30 border border-red-700 rounded-xl">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* 변경 버튼 */}
            <button
              type="submit"
              disabled={isLoading || !newPassword || !confirmPassword}
              className={`w-full py-3 rounded-xl font-semibold transition-all ${
                isLoading || !newPassword || !confirmPassword
                  ? "bg-slate-600 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 shadow-lg shadow-purple-500/25"
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  변경 중...
                </span>
              ) : (
                "비밀번호 변경"
              )}
            </button>
          </form>
        </div>

        {/* 돌아가기 버튼 */}
        <div className="text-center">
          <Link
            href={userRole === "admin" ? "/" : "/upload"}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors"
          >
            ← 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}

// AuthGuard로 감싸는 wrapper 컴포넌트
export default function SettingsPage() {
  return (
    <AuthGuard allowedRoles={["admin", "client"]}>
      <SettingsPageContent />
    </AuthGuard>
  );
}

