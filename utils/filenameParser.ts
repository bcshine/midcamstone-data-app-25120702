// =====================================================
// 파일명 파싱 유틸리티
// 파일명에서 회사명과 날짜를 추출합니다.
// 형식: "회사명YYMMDD.csv" (예: "모찌고251206.csv")
// =====================================================

/**
 * 파일명 파싱 결과 타입
 */
export interface FileNameParseResult {
  isValid: boolean;           // 파일명 형식이 올바른지
  companyName: string;        // 추출된 회사명 (한글)
  fileDate: string;           // 추출된 날짜 (YYMMDD)
  tableName: string;          // 생성할 테이블명 (영문/숫자)
  errorMessage?: string;      // 오류 메시지
}

/**
 * 파일명에서 회사명과 날짜를 추출합니다.
 * 
 * 지원하는 파일명 형식:
 * - "회사명YYMMDD.csv" (예: 모찌고251206.csv) - 기본 형식
 * 
 * @param fileName - 파일명 (확장자 포함)
 * @returns FileNameParseResult
 */
export function parseFileName(fileName: string): FileNameParseResult {
  // 기본 결과 객체
  const result: FileNameParseResult = {
    isValid: false,
    companyName: '',
    fileDate: '',
    tableName: '',
  };

  // CSV 파일인지 확인
  if (!fileName.toLowerCase().endsWith('.csv')) {
    result.errorMessage = 'CSV 파일만 업로드할 수 있습니다.';
    return result;
  }

  // 확장자 제거
  const nameWithoutExt = fileName.slice(0, -4);

  // 날짜 패턴 찾기 (YYMMDD - 6자리 숫자, 파일명 끝에 위치)
  const datePattern = /(\d{6})$/;
  const dateMatch = nameWithoutExt.match(datePattern);

  if (!dateMatch) {
    result.errorMessage = '파일명 끝에 날짜(YYMMDD 형식)가 필요합니다. 예: "모찌고251206.csv"';
    return result;
  }

  const fileDate = dateMatch[1];
  
  // 날짜 유효성 검사 (간단한 범위 체크)
  const month = parseInt(fileDate.substring(2, 4));
  const day = parseInt(fileDate.substring(4, 6));

  if (month < 1 || month > 12) {
    result.errorMessage = `잘못된 월(${month})입니다. 1~12 사이여야 합니다.`;
    return result;
  }

  if (day < 1 || day > 31) {
    result.errorMessage = `잘못된 일(${day})입니다. 1~31 사이여야 합니다.`;
    return result;
  }

  // 날짜 부분 제거하고 회사명 추출
  const companyName = nameWithoutExt.slice(0, -6).trim();

  // 회사명이 비어있는지 확인
  if (!companyName) {
    result.errorMessage = '파일명에서 회사명을 찾을 수 없습니다. 예: "모찌고251206.csv"';
    return result;
  }

  // 테이블명 생성 (회사명을 영문/숫자로 변환)
  const tableName = generateTableName(companyName, fileDate);

  result.isValid = true;
  result.companyName = companyName;
  result.fileDate = fileDate;
  result.tableName = tableName;

  return result;
}

/**
 * 회사명과 날짜를 기반으로 테이블명을 생성합니다.
 * - 한글은 초성으로 변환 또는 영문 음역
 * - 특수문자, 공백은 언더스코어로 변환
 * - 앞에 'sales_' 접두사 추가
 * 
 * @param companyName - 회사명 (한글)
 * @param fileDate - 날짜 (YYMMDD)
 * @returns 테이블명
 */
function generateTableName(companyName: string, fileDate: string): string {
  // 한글을 영문으로 변환 (간단한 음역)
  const romanized = romanizeKorean(companyName);
  
  // 특수문자 제거, 공백을 언더스코어로 변환
  const sanitized = romanized
    .toLowerCase()
    .replace(/\s+/g, '_')           // 공백 → 언더스코어
    .replace(/[^a-z0-9_]/g, '')     // 영문, 숫자, 언더스코어만 허용
    .replace(/_+/g, '_')            // 연속 언더스코어 제거
    .replace(/^_|_$/g, '');         // 앞뒤 언더스코어 제거

  // 테이블명이 비어있으면 기본값 사용
  const baseName = sanitized || 'company';

  // sales_회사명날짜 형식으로 반환 (언더스코어 없이 회사명+날짜)
  return `sales_${baseName}${fileDate}`;
}

/**
 * 한글을 영문으로 음역합니다 (간단한 버전).
 * 완벽한 음역이 아닌, 테이블명 생성용 간단한 변환입니다.
 * 
 * @param korean - 한글 문자열
 * @returns 영문 문자열
 */
function romanizeKorean(korean: string): string {
  // 초성 테이블
  const cho = ['g', 'gg', 'n', 'd', 'dd', 'r', 'm', 'b', 'bb', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
  // 중성 테이블
  const jung = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
  // 종성 테이블
  const jong = ['', 'g', 'gg', 'gs', 'n', 'nj', 'nh', 'd', 'l', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'b', 'bs', 's', 'ss', 'ng', 'j', 'ch', 'k', 't', 'p', 'h'];

  let result = '';

  for (let i = 0; i < korean.length; i++) {
    const char = korean[i];
    const code = char.charCodeAt(0);

    // 한글 유니코드 범위: 0xAC00 ~ 0xD7A3
    if (code >= 0xAC00 && code <= 0xD7A3) {
      const offset = code - 0xAC00;
      const choIdx = Math.floor(offset / 588);
      const jungIdx = Math.floor((offset % 588) / 28);
      const jongIdx = offset % 28;

      result += cho[choIdx] + jung[jungIdx] + jong[jongIdx];
    } else if (/[a-zA-Z0-9]/.test(char)) {
      // 영문, 숫자는 그대로
      result += char;
    } else if (/\s/.test(char)) {
      // 공백은 유지
      result += ' ';
    }
    // 그 외 특수문자는 무시
  }

  return result;
}

/**
 * 테이블명이 유효한지 검사합니다.
 * PostgreSQL 테이블명 규칙을 따릅니다.
 * 
 * @param tableName - 검사할 테이블명
 * @returns 유효 여부
 */
export function isValidTableName(tableName: string): boolean {
  // 빈 문자열 체크
  if (!tableName) return false;
  
  // 길이 체크 (PostgreSQL 최대 63자)
  if (tableName.length > 63) return false;
  
  // 영문, 숫자, 언더스코어만 허용, 숫자로 시작 불가
  const pattern = /^[a-z_][a-z0-9_]*$/;
  return pattern.test(tableName);
}
