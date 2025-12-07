"use client";

// =====================================================
// 휴지통 페이지 (관리자 전용)
// 삭제된 데이터를 확인하고 복원하거나 완전 삭제합니다.
// =====================================================

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthGuard from "../../../components/AuthGuard";
import { signOut } from "../../../lib/auth";

// 휴지통 항목 타입
interface TrashItem {
  id: number;
  table_name: string;
  company_name: string;
  file_name: string;
  file_date: string;
  row_count: number;
  deleted_at: string;
  expires_at: string;
  daysLeft: number;
}

function TrashPageContent() {
  const router = useRouter();

  // 상태 관리
  const [items, setItems] = useState<TrashItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<{ id: number; action: "restore" | "delete"; name: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 로그아웃 핸들러
  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  // 데이터 로드
  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/trash");
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "데이터 로드 실패");
        return;
      }

      setItems(data.items || []);
      setError(null);
    } catch (err) {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // 복원 처리
  const handleRestore = async (id: number) => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/admin/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`복원 실패: ${data.error}`);
        return;
      }

      alert(data.message);
      setActionTarget(null);
      await fetchItems();
    } catch (err) {
      alert("복원 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 완전 삭제 처리
  const handlePermanentDelete = async (id: number) => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/admin/trash", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`삭제 실패: ${data.error}`);
        return;
      }

      alert(data.message);
      setActionTarget(null);
      await fetchItems();
    } catch (err) {
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* 상단 네비게이션 바 */}
        <div className="flex items-center justify-end gap-3 mb-6">
          <Link
            href="/"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-sm transition-colors"
          >
            관리자 홈
          </Link>
          <Link
            href="/admin"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-sm transition-colors"
          >
            고객사 목록
          </Link>
          <Link
            href="/settings"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-sm transition-colors"
          >
            ⚙️ 설정
          </Link>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-sm transition-colors"
          >
            로그아웃
          </button>
        </div>

        {/* 헤더 */}
        <header className="mb-10">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent">
            🗑️ 휴지통
          </h1>
          <p className="text-slate-400">
            삭제된 데이터는 30일 후 자동으로 완전 삭제됩니다
          </p>
        </header>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
            <p className="mt-4 text-slate-400">데이터 로드 중...</p>
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* 휴지통 목록 */}
        {!isLoading && !error && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            {items.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🗑️</div>
                <p className="text-slate-400 text-lg">휴지통이 비어있습니다</p>
              </div>
            ) : (
              <>
                <div className="mb-4 text-slate-400 text-sm">
                  총 {items.length}개 항목
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-600">
                        <th className="text-left px-4 py-3 text-slate-400 font-medium">
                          파일명
                        </th>
                        <th className="text-left px-4 py-3 text-slate-400 font-medium">
                          고객사
                        </th>
                        <th className="text-left px-4 py-3 text-slate-400 font-medium">
                          행 수
                        </th>
                        <th className="text-left px-4 py-3 text-slate-400 font-medium">
                          삭제일
                        </th>
                        <th className="text-left px-4 py-3 text-slate-400 font-medium">
                          남은 기간
                        </th>
                        <th className="text-left px-4 py-3 text-slate-400 font-medium">
                          작업
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr
                          key={item.id}
                          className={`border-b border-slate-700/50 hover:bg-slate-700/30 ${
                            index % 2 === 0 ? "bg-slate-900/20" : ""
                          }`}
                        >
                          <td className="px-4 py-4">
                            <div className="font-medium text-white">
                              {item.file_name}
                            </div>
                            <div className="text-sm text-slate-500">
                              {item.table_name}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-300">
                            {item.company_name}
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-emerald-400 font-medium">
                              {item.row_count}행
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-400">
                            {formatDate(item.deleted_at)}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium ${
                                item.daysLeft <= 7
                                  ? "bg-red-900/50 text-red-400"
                                  : item.daysLeft <= 14
                                  ? "bg-yellow-900/50 text-yellow-400"
                                  : "bg-slate-700 text-slate-300"
                              }`}
                            >
                              {item.daysLeft}일 남음
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  setActionTarget({
                                    id: item.id,
                                    action: "restore",
                                    name: item.file_name,
                                  })
                                }
                                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors"
                              >
                                복원
                              </button>
                              <button
                                onClick={() =>
                                  setActionTarget({
                                    id: item.id,
                                    action: "delete",
                                    name: item.file_name,
                                  })
                                }
                                className="px-3 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium transition-colors"
                              >
                                완전삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* 푸터 */}
        <footer className="mt-10 text-center">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors"
          >
            ← 고객사 목록으로
          </Link>
        </footer>
      </div>

      {/* 확인 모달 */}
      {actionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">
              {actionTarget.action === "restore" ? "🔄 복원 확인" : "⚠️ 완전 삭제 확인"}
            </h3>
            <p className="text-slate-300 mb-2">
              {actionTarget.action === "restore"
                ? "이 데이터를 복원하시겠습니까?"
                : "정말로 완전히 삭제하시겠습니까?"}
            </p>
            <p className="text-cyan-400 font-mono text-sm mb-6 p-3 bg-slate-900 rounded-lg">
              {actionTarget.name}
            </p>
            {actionTarget.action === "delete" && (
              <p className="text-red-400 text-sm mb-6">
                ⚠️ 완전 삭제 후에는 복구할 수 없습니다!
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setActionTarget(null)}
                disabled={isProcessing}
                className="flex-1 px-4 py-3 bg-slate-600 hover:bg-slate-500 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={() =>
                  actionTarget.action === "restore"
                    ? handleRestore(actionTarget.id)
                    : handlePermanentDelete(actionTarget.id)
                }
                disabled={isProcessing}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                  actionTarget.action === "restore"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-red-600 hover:bg-red-500"
                }`}
              >
                {isProcessing
                  ? "처리 중..."
                  : actionTarget.action === "restore"
                  ? "복원"
                  : "완전 삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// AuthGuard로 감싸는 wrapper 컴포넌트
export default function TrashPage() {
  return (
    <AuthGuard allowedRoles={["admin"]}>
      <TrashPageContent />
    </AuthGuard>
  );
}

