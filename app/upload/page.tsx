"use client";

// =====================================================
// CSV 업로드 페이지
// 회사명 입력 → 파일 선택 → 미리보기 → 업로드
// (관리자 + 고객사 접근 가능)
// =====================================================

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../../components/AuthGuard";
import { signOut, getUserRole, type UserRole } from "../../lib/auth";

// CSV 미리보기 타입
interface CSVPreview {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

function UploadPageContent() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userCompany, setUserCompany] = useState<string | null>(null);

  // 사용자 역할 로드
  useEffect(() => {
    async function loadUserRole() {
      const roleInfo = await getUserRole();
      if (roleInfo) {
        setUserRole(roleInfo.role);
        setUserCompany(roleInfo.companyName);
      }
    }
    loadUserRole();
  }, []);

  // 로그아웃 핸들러
  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };
  // 상태 관리
  const [companyName, setCompanyName] = useState("");                // 회사명 (사용자 입력)
  const [file, setFile] = useState<File | null>(null);               // 선택된 파일
  const [csvPreview, setCsvPreview] = useState<CSVPreview | null>(null);  // CSV 미리보기 데이터
  const [isUploading, setIsUploading] = useState(false);             // 업로드 중 여부
  const [uploadResult, setUploadResult] = useState<{                 // 업로드 결과
    success: boolean;
    message: string;
    details?: {
      companyName: string;
      tableName: string;
      rowCount: number;
    };
  } | null>(null);

  // 오늘 날짜를 YYMMDD 형식으로 생성
  const getTodayDate = (): string => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yy}${mm}${dd}`;
  };

  // 자동 생성되는 파일명 (회사명YYMMDD.csv 형식)
  const generatedFileName = companyName.trim() 
    ? `${companyName.trim()}${getTodayDate()}.csv`
    : "";

  /**
   * 파일 선택 핸들러
   */
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    
    // 이전 상태 초기화
    setFile(null);
    setCsvPreview(null);
    setUploadResult(null);

    if (!selectedFile) return;

    // CSV 파일 확인
    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setUploadResult({
        success: false,
        message: "CSV 파일만 업로드할 수 있습니다.",
      });
      return;
    }

    setFile(selectedFile);
    
    try {
      // CSV 파일 읽기
      const text = await selectedFile.text();
      const preview = parseCSVForPreview(text, 5);  // 최대 5행 미리보기
      setCsvPreview(preview);
    } catch (error) {
      console.error("CSV 파싱 오류:", error);
      setCsvPreview(null);
    }
  }, []);

  /**
   * 업로드 핸들러
   */
  const handleUpload = async () => {
    // 회사명 확인
    if (!companyName.trim()) {
      setUploadResult({
        success: false,
        message: "회사명을 입력해주세요.",
      });
      return;
    }

    // 파일 확인
    if (!file) {
      setUploadResult({
        success: false,
        message: "CSV 파일을 선택해주세요.",
      });
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      // 파일명을 자동 생성된 이름으로 변경하여 새 File 객체 생성
      const renamedFile = new File([file], generatedFileName, { type: file.type });

      // FormData 생성
      const formData = new FormData();
      formData.append("file", renamedFile);

      // API 호출
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadResult({
          success: false,
          message: data.error || "업로드 실패",
        });
      } else {
        setUploadResult({
          success: true,
          message: data.message,
          details: {
            companyName: data.companyName,
            tableName: data.tableName,
            rowCount: data.rowCount,
          },
        });
        
        // 성공 시 폼 초기화
        setCompanyName("");
        setFile(null);
        setCsvPreview(null);
      }
    } catch (error) {
      setUploadResult({
        success: false,
        message: "네트워크 오류가 발생했습니다.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * 폼 초기화
   */
  const handleReset = () => {
    setCompanyName("");
    setFile(null);
    setCsvPreview(null);
    setUploadResult(null);
  };

  // 업로드 가능 여부
  const canUpload = companyName.trim() && file && csvPreview;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4 md:p-8 relative">
      {/* 상단 네비게이션 */}
      <div className="flex flex-wrap items-center justify-end gap-2 mb-4 md:mb-6">
        {userRole === "admin" && (
          <a
            href="/"
            className="px-2 py-1.5 md:px-4 md:py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-xs md:text-sm transition-colors"
          >
            관리자 홈
          </a>
        )}
        <a
          href="/settings"
          className="px-2 py-1.5 md:px-4 md:py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-xs md:text-sm transition-colors"
        >
          ⚙️ 설정
        </a>
        <button
          onClick={handleLogout}
          className="px-2 py-1.5 md:px-4 md:py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-xs md:text-sm transition-colors"
        >
          로그아웃
        </button>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <header className="text-center mb-6 md:mb-10">
          <h1 className="text-xl md:text-4xl font-bold mb-2 md:mb-3 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            데이터 업로드 (CSV)
          </h1>
          <p className="text-slate-400 text-sm md:text-lg">
            회사 매출 데이터를 Supabase에 저장합니다
          </p>
          {userCompany && (
            <p className="mt-2 text-emerald-400 text-xs md:text-sm">🏢 {userCompany}</p>
          )}
        </header>

        {/* 1. 회사명 입력 */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">1. 회사명 입력</h2>
          
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="예: 모찌고"
            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
            disabled={isUploading}
          />
          
          {/* 자동 생성되는 파일명 미리보기 */}
          {companyName.trim() && (
            <div className="mt-3 p-3 bg-slate-900/50 rounded-lg">
              <span className="text-slate-400 text-sm">저장될 이름: </span>
              <span className="text-cyan-400 font-mono text-sm">{generatedFileName}</span>
              <span className="text-slate-500 text-xs ml-2">(회사명+날짜)</span>
            </div>
          )}
        </div>

        {/* 2. 파일 선택 영역 */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">2. CSV 파일 선택</h2>
          
          <div className="flex items-center gap-4">
            <label className="flex-1">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />
              <div className="flex items-center justify-center px-6 py-4 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-cyan-500 hover:bg-slate-700/50 transition-all">
                <span className="text-slate-400">
                  {file ? `✅ ${file.name}` : "클릭하여 CSV 파일 선택..."}
                </span>
              </div>
            </label>
            
            {(file || companyName) && (
              <button
                onClick={handleReset}
                className="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                disabled={isUploading}
              >
                초기화
              </button>
            )}
          </div>
        </div>

        {/* CSV 미리보기 */}
        {csvPreview && csvPreview.headers.length > 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              3. 데이터 미리보기 
              <span className="text-sm font-normal text-slate-400 ml-2">
                (총 {csvPreview.totalRows}행 중 상위 {csvPreview.rows.length}행)
              </span>
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-600">
                    {csvPreview.headers.map((header, index) => (
                      <th 
                        key={index} 
                        className="text-left px-3 py-2 text-cyan-400 font-medium whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvPreview.rows.map((row, rowIndex) => (
                    <tr 
                      key={rowIndex} 
                      className="border-b border-slate-700/50 hover:bg-slate-700/30"
                    >
                      {row.map((cell, cellIndex) => (
                        <td 
                          key={cellIndex} 
                          className="px-3 py-2 text-slate-300 whitespace-nowrap max-w-[200px] truncate"
                          title={cell}
                        >
                          {cell || <span className="text-slate-500">-</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 업로드 버튼 */}
        {canUpload && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">4. 업로드</h2>
            
            {/* 업로드 정보 요약 */}
            <div className="mb-4 p-4 bg-slate-900/50 rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-slate-400">회사명:</span>
                  <span className="ml-2 text-emerald-400 font-semibold">{companyName}</span>
                </div>
                <div>
                  <span className="text-slate-400">날짜:</span>
                  <span className="ml-2 text-emerald-400">{getTodayDate()}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">저장될 파일명:</span>
                  <span className="ml-2 text-cyan-400 font-mono">{generatedFileName}</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                isUploading
                  ? "bg-slate-600 cursor-not-allowed"
                  : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25"
              }`}
            >
              {isUploading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  업로드 중...
                </span>
              ) : (
                "🚀 Supabase에 업로드"
              )}
            </button>
          </div>
        )}

        {/* 업로드 결과 */}
        {uploadResult && (
          <div className={`rounded-xl p-6 border ${
            uploadResult.success 
              ? "bg-emerald-900/30 border-emerald-700" 
              : "bg-red-900/30 border-red-700"
          }`}>
            <h2 className="text-xl font-semibold mb-3">
              {uploadResult.success ? "🎉 업로드 완료!" : "⚠️ 업로드 실패"}
            </h2>
            
            <p className={uploadResult.success ? "text-emerald-400" : "text-red-400"}>
              {uploadResult.message}
            </p>
            
            {uploadResult.details && (
              <div className="mt-4 p-4 bg-slate-900/50 rounded-lg">
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <span className="text-slate-400">회사명:</span>
                    <span className="ml-2 text-white">{uploadResult.details.companyName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">생성된 테이블:</span>
                    <span className="ml-2 text-cyan-400 font-mono">{uploadResult.details.tableName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">저장된 행 수:</span>
                    <span className="ml-2 text-emerald-400">{uploadResult.details.rowCount}행</span>
                  </div>
                </div>

                {/* 데이터 확인하기 버튼 */}
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <a
                    href={`/data/${encodeURIComponent(uploadResult.details.companyName)}/${encodeURIComponent(uploadResult.details.tableName)}`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl font-medium transition-all shadow-lg shadow-cyan-500/25"
                  >
                    📊 업로드된 데이터 확인하기
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 처음으로 돌아가기 버튼 */}
        <div className="mt-10 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors"
          >
            ← 처음으로 돌아가기
          </a>
        </div>

        {/* 푸터 */}
        <footer className="mt-12 text-center text-slate-500 text-sm">
          <p>Powered by Supabase & Next.js</p>
        </footer>
      </div>
    </main>
  );
}

/**
 * CSV 텍스트를 미리보기용으로 파싱합니다.
 * (클라이언트 사이드용 간단한 파서)
 */
function parseCSVForPreview(csv: string, maxRows: number = 5): CSVPreview {
  // BOM 제거
  const cleanCsv = csv.replace(/^\uFEFF/, '');
  
  // 줄 분리
  const lines = cleanCsv.split(/\r?\n/).filter(line => line.trim());
  
  if (lines.length < 1) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  // 헤더 파싱
  const headers = parseCSVRow(lines[0]);
  
  // 데이터 행 파싱 (미리보기 행 수만큼)
  const rows: string[][] = [];
  const previewCount = Math.min(maxRows, lines.length - 1);
  
  for (let i = 1; i <= previewCount; i++) {
    if (lines[i]) {
      rows.push(parseCSVRow(lines[i]));
    }
  }

  return {
    headers,
    rows,
    totalRows: lines.length - 1,
  };
}

/**
 * CSV 한 줄을 파싱합니다.
 */
function parseCSVRow(row: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];

    if (char === '"') {
      if (row[i + 1] === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      fields.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }

  fields.push(currentField.trim());
  return fields;
}

// AuthGuard로 감싸는 wrapper 컴포넌트
export default function UploadPage() {
  return (
    <AuthGuard allowedRoles={["admin", "client"]}>
      <UploadPageContent />
    </AuthGuard>
  );
}
