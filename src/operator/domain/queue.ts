import type { OperatorReport, QueueFilters } from "../types";
import {
  TRIAGE_SORT_PRIORITY,
  isClosedStatus,
  isUnhandledEmergency,
} from "./report-machine";

/**
 * 큐 정렬·필터 selector.
 * 응급 카운터는 필터와 독립적으로 전체 미처리 응급 수를 계산한다.
 */

/** 기본 정렬: 응급 → 확인 필요 → 분석/불가 → 부정, 같은 급이면 오래된 미처리 우선 */
export function sortQueue(reports: OperatorReport[]): OperatorReport[] {
  return [...reports].sort((a, b) => {
    const pa = TRIAGE_SORT_PRIORITY[a.triage.currentType];
    const pb = TRIAGE_SORT_PRIORITY[b.triage.currentType];
    if (pa !== pb) return pa - pb;
    return a.submittedAt.localeCompare(b.submittedAt);
  });
}

export function applyFilters(
  reports: OperatorReport[],
  filters: QueueFilters,
  currentOperatorId?: string,
): OperatorReport[] {
  const query = filters.query.trim().toLowerCase();
  return reports.filter((report) => {
    /* 병합된 사건은 대표 사건 아래에서만 노출 */
    if (report.mergedIntoReportId) return false;
    if (!filters.includeClosed && isClosedStatus(report.status)) {
      /* 종결 상태를 명시적으로 필터에 선택했다면 표시 */
      const explicitlySelected = filters.statuses.some((s) => isClosedStatus(s));
      if (!explicitlySelected) return false;
    }
    if (filters.triage.length > 0 && !filters.triage.includes(report.triage.currentType)) {
      return false;
    }
    if (filters.statuses.length > 0 && !filters.statuses.includes(report.status)) {
      return false;
    }
    if (filters.regions.length > 0) {
      const matched = filters.regions.some((region) =>
        report.location.address.includes(region),
      );
      if (!matched) return false;
    }
    if (filters.assigneeIds.length > 0) {
      if (!report.assignee || !filters.assigneeIds.includes(report.assignee.id)) {
        return false;
      }
    }
    if (filters.assignedToMe) {
      if (!currentOperatorId || report.assignee?.id !== currentOperatorId) return false;
    }
    if (filters.dateFrom && report.submittedAt < filters.dateFrom) return false;
    if (filters.dateTo) {
      const end = `${filters.dateTo}T23:59:59`;
      if (report.submittedAt > end) return false;
    }
    if (query) {
      const haystack = [
        report.reportId,
        report.location.address,
        report.triage.summary,
        report.reporterContext.description ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

/** 전체 미처리 응급 통계 (필터와 무관) */
export function getEmergencyStats(
  reports: OperatorReport[],
  now: Date = new Date(),
): { count: number; oldestWaitingMinutes: number } {
  const unhandled = reports.filter(
    (r) =>
      !r.mergedIntoReportId &&
      isUnhandledEmergency(r.triage.currentType, r.status),
  );
  let oldest = 0;
  for (const report of unhandled) {
    const minutes = Math.floor(
      (now.getTime() - new Date(report.submittedAt).getTime()) / 60000,
    );
    if (minutes > oldest) oldest = minutes;
  }
  return { count: unhandled.length, oldestWaitingMinutes: oldest };
}

/** 지역 필터 옵션: 주소에서 시 단위 추출 */
export const REGION_OPTIONS = ["제주시", "서귀포시"];
