import { formatAbsolute, formatFileStamp } from "../../lib/date-time";
import type { StatisticsResult } from "./statistics-service";

/**
 * 보고서 내보내기 adapter.
 * - CSV: 클라이언트에서 생성 가능 (구현됨)
 * - PDF: 서버 생성 API 미연동 — 인쇄용 화면 폴백만 제공 (mock)
 * 내보내기 파일에는 기간과 지표 기준 정의를 포함하고,
 * 개인정보·정확 좌표는 포함하지 않는다.
 */

export interface ExportService {
  /** 통계 CSV를 클라이언트에서 생성해 내려받는다. */
  exportStatisticsCsv(stats: StatisticsResult): string;
  /** PDF 폴백: 인쇄 다이얼로그. 실제 서버 PDF 생성은 미구현. */
  exportPrintFallback(): void;
  readonly isPdfServerAvailable: boolean;
}

function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Array<Array<string | number>>): string {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

function download(filename: string, content: string, mime: string): void {
  /* Excel 한글 호환을 위한 UTF-8 BOM */
  const blob = new Blob([`﻿${content}`], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export const exportService: ExportService = {
  isPdfServerAvailable: false,

  exportStatisticsCsv(stats) {
    const rows: Array<Array<string | number>> = [
      ["DOG-LINK 운영 통계 보고서"],
      ["기간", `${formatAbsolute(stats.period.from.toISOString())} ~ ${formatAbsolute(stats.period.to.toISOString())} (${stats.period.label})`],
      ["생성 시각", formatAbsolute(new Date().toISOString())],
      [],
      ["지표", "값", "기준 정의"],
      ...stats.metrics.map((m) => [m.label, m.value, m.definition]),
      [],
      ["일자", "제보 수", "응급 수"],
      ...stats.trend.map((t) => [t.dateLabel, t.total, t.emergency]),
      [],
      ["지역", "건수"],
      ...stats.regions.map((r) => [r.region, r.count]),
      [],
      ["비고", "개인정보 및 정확 좌표는 본 보고서에 포함되지 않습니다."],
    ];
    const filename = `doglink-statistics-${formatFileStamp()}.csv`;
    download(filename, toCsv(rows), "text/csv;charset=utf-8");
    return filename;
  },

  exportPrintFallback() {
    window.print();
  },
};
