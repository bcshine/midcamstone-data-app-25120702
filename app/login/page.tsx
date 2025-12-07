"use client";

// =====================================================
// 로그인/회원가입 페이지
// 탭 형태로 로그인과 회원가입을 제공합니다.
// =====================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getUserRole } from "../../lib/auth";
import { supabaseBrowser } from "../../lib/supabase-browser";

// 탭 타입
type TabType = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  
  // 상태 관리
  const [activeTab, setActiveTab] = useState<TabType>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /**
   * 탭 변경 핸들러
   */
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setError(null);
    setSuccess(null);
  };

  /**
   * 로그인 핸들러
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      // 로그인 시도
      const result = await signIn(email, password);

      if (!result.success) {
        setError(result.error || "로그인에 실패했습니다.");
        setIsLoading(false);
        return;
      }

      // 역할 조회
      const roleInfo = await getUserRole();

      if (!roleInfo) {
        setError("사용자 역할이 설정되지 않았습니다. 관리자에게 문의하세요.");
        setIsLoading(false);
        return;
      }

      // 역할에 따라 리다이렉트
      if (roleInfo.role === "admin") {
        router.push("/");  // 관리자 → 홈
      } else {
        router.push("/upload");  // 고객사 → 업로드 페이지
      }

    } catch (err) {
      setError("로그인 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  /**
   * 회원가입 핸들러
   */
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // 유효성 검사
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    setIsLoading(true);

    try {
      // Supabase Auth로 회원가입
      const { data, error: signUpError } = await supabaseBrowser.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // user_roles 테이블에 역할 추가 (기본: client)
        const { error: roleError } = await supabaseBrowser
          .from("user_roles")
          .insert({
            user_id: data.user.id,
            role: "client",
            company_name: companyName || null,
          });

        if (roleError) {
          console.error("역할 설정 오류:", roleError);
          // 역할 설정 실패해도 회원가입은 성공으로 처리
        }

        setSuccess("회원가입이 완료되었습니다! 로그인해주세요.");
        setActiveTab("login");
        setPassword("");
        setPasswordConfirm("");
        setCompanyName("");
      }

    } catch (err) {
      setError("회원가입 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* 로고/타이틀 */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            중간계 AI 연구소
          </h1>
          <p className="text-slate-400">
            데이터 분석 플랫폼
          </p>
        </div>

        {/* 탭 선택 */}
        <div className="flex mb-6">
          <button
            onClick={() => handleTabChange("login")}
            className={`flex-1 py-3 text-center font-medium rounded-l-xl transition-all ${
              activeTab === "login"
                ? "bg-slate-700 text-white"
                : "bg-slate-800/50 text-slate-500 hover:text-slate-300"
            }`}
          >
            로그인
          </button>
          <button
            onClick={() => handleTabChange("signup")}
            className={`flex-1 py-3 text-center font-medium rounded-r-xl transition-all ${
              activeTab === "signup"
                ? "bg-slate-700 text-white"
                : "bg-slate-800/50 text-slate-500 hover:text-slate-300"
            }`}
          >
            회원가입
          </button>
        </div>

        {/* 폼 영역 */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
          {activeTab === "login" ? (
            // 로그인 폼
            <form onSubmit={handleLogin} className="space-y-6">
              {/* 이메일 입력 */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                  이메일
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@company.com"
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all disabled:opacity-50"
                />
              </div>

              {/* 비밀번호 입력 */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                  비밀번호
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all disabled:opacity-50"
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

              {/* 로그인 버튼 */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                  isLoading
                    ? "bg-slate-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25"
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    로그인 중...
                  </span>
                ) : (
                  "로그인"
                )}
              </button>
            </form>
          ) : (
            // 회원가입 폼
            <form onSubmit={handleSignup} className="space-y-5">
              {/* 이메일 입력 */}
              <div>
                <label htmlFor="signup-email" className="block text-sm font-medium text-slate-300 mb-2">
                  이메일
                </label>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@company.com"
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all disabled:opacity-50"
                />
              </div>

              {/* 비밀번호 입력 */}
              <div>
                <label htmlFor="signup-password" className="block text-sm font-medium text-slate-300 mb-2">
                  비밀번호 (6자 이상)
                </label>
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all disabled:opacity-50"
                />
              </div>

              {/* 비밀번호 확인 */}
              <div>
                <label htmlFor="password-confirm" className="block text-sm font-medium text-slate-300 mb-2">
                  비밀번호 확인
                </label>
                <input
                  id="password-confirm"
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all disabled:opacity-50"
                />
              </div>

              {/* 회사명 입력 (선택) */}
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-slate-300 mb-2">
                  회사명 <span className="text-slate-500">(선택)</span>
                </label>
                <input
                  id="company"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="예: 모찌고"
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all disabled:opacity-50"
                />
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="p-4 bg-red-900/30 border border-red-700 rounded-xl">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* 회원가입 버튼 */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                  isLoading
                    ? "bg-slate-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 shadow-lg shadow-emerald-500/25"
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    가입 중...
                  </span>
                ) : (
                  "회원가입"
                )}
              </button>

              <p className="text-slate-500 text-xs text-center">
                회원가입 시 고객사(client) 권한이 부여됩니다.
              </p>
            </form>
          )}
        </div>

        {/* 안내 문구 */}
        <p className="mt-8 text-center text-slate-500 text-sm">
          {activeTab === "login" 
            ? "처음이신가요? 회원가입 탭을 클릭하세요." 
            : "이미 계정이 있으신가요? 로그인 탭을 클릭하세요."}
        </p>
      </div>
    </main>
  );
}
