// =====================================================
// CSV 파싱 유틸리티
// 한글, 콤마 포함 데이터, 따옴표로 감싼 필드 등을 처리합니다.
// =====================================================

/**
 * CSV 텍스트를 JSON 배열로 변환합니다.
 * - 따옴표로 감싼 필드 내의 콤마 처리
 * - 따옴표로 감싼 필드 내의 줄바꿈 처리
 * - 한글 및 특수문자 지원
 * 
 * @param csv - CSV 형식의 문자열
 * @returns JSON 객체 배열
 */
export function csvToJsonArray(csv: string): Record<string, string>[] {
  // BOM (Byte Order Mark) 제거 - 엑셀에서 저장한 UTF-8 CSV에 포함될 수 있음
  const cleanCsv = csv.replace(/^\uFEFF/, '');
  
  // CSV 라인 파싱 (따옴표 내 줄바꿈 고려)
  const lines = parseCSVLines(cleanCsv);
  
  // 빈 CSV 체크
  if (lines.length < 2) {
    return [];
  }
  
  // 첫 번째 줄은 헤더
  const headers = parseCSVRow(lines[0]);
  
  // 나머지 줄은 데이터
  const result: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 빈 줄 건너뛰기
    if (!line) continue;
    
    const values = parseCSVRow(line);
    const obj: Record<string, string> = {};
    
    // 각 헤더에 대응하는 값 매핑
    headers.forEach((header, index) => {
      // 헤더 이름 정리 (공백 제거, 특수문자 처리)
      const cleanHeader = header.trim();
      // 값이 없으면 빈 문자열
      obj[cleanHeader] = values[index]?.trim() ?? '';
    });
    
    result.push(obj);
  }
  
  return result;
}

/**
 * CSV 텍스트를 줄 단위로 파싱합니다.
 * 따옴표 내의 줄바꿈은 하나의 필드로 처리합니다.
 * 
 * @param csv - CSV 형식의 문자열
 * @returns 줄 배열
 */
function parseCSVLines(csv: string): string[] {
  const lines: string[] = [];
  let currentLine = '';
  let insideQuotes = false;
  
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    
    if (char === '"') {
      // 이스케이프된 따옴표 ("") 체크
      if (csv[i + 1] === '"') {
        currentLine += '""';
        i++; // 다음 따옴표 건너뛰기
      } else {
        insideQuotes = !insideQuotes;
        currentLine += char;
      }
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      // 줄바꿈 (따옴표 밖에서만)
      if (char === '\r' && csv[i + 1] === '\n') {
        i++; // \r\n 처리
      }
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  
  // 마지막 줄 추가
  if (currentLine.trim()) {
    lines.push(currentLine);
  }
  
  return lines;
}

/**
 * CSV 한 줄을 필드 배열로 파싱합니다.
 * 따옴표로 감싼 필드와 콤마를 올바르게 처리합니다.
 * 
 * @param row - CSV 한 줄
 * @returns 필드 값 배열
 */
function parseCSVRow(row: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let insideQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      // 이스케이프된 따옴표 ("") 체크
      if (row[i + 1] === '"') {
        currentField += '"';
        i++; // 다음 따옴표 건너뛰기
      } else {
        insideQuotes = !insideQuotes;
        // 따옴표는 결과에 포함하지 않음
      }
    } else if (char === ',' && !insideQuotes) {
      // 필드 구분자 (따옴표 밖에서만)
      fields.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }
  
  // 마지막 필드 추가
  fields.push(currentField);
  
  return fields;
}

/**
 * CSV 데이터의 미리보기를 생성합니다.
 * 
 * @param csv - CSV 형식의 문자열
 * @param maxRows - 최대 표시할 행 수 (기본값: 5)
 * @returns { headers: string[], rows: string[][], totalRows: number }
 */
export function getCSVPreview(csv: string, maxRows: number = 5): {
  headers: string[];
  rows: string[][];
  totalRows: number;
} {
  const cleanCsv = csv.replace(/^\uFEFF/, '');
  const lines = parseCSVLines(cleanCsv);
  
  if (lines.length < 1) {
    return { headers: [], rows: [], totalRows: 0 };
  }
  
  const headers = parseCSVRow(lines[0]).map(h => h.trim());
  const rows: string[][] = [];
  
  // 미리보기 행 수만큼만 파싱
  const previewCount = Math.min(maxRows, lines.length - 1);
  for (let i = 1; i <= previewCount; i++) {
    if (lines[i]) {
      rows.push(parseCSVRow(lines[i]).map(v => v.trim()));
    }
  }
  
  return {
    headers,
    rows,
    totalRows: lines.length - 1 // 헤더 제외한 데이터 행 수
  };
}










