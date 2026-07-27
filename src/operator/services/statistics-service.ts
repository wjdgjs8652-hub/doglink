import { minutesBetween } from "../../lib/date-time";
import type { OperatorReport } from "../types";

/**
 * 통계·보고 서비스 (클라이언트 집계 — mock).
 * 실제 집계 API가 연결되면 이 구현만 교체한다.
 * 모든 지표에는 기준 정의를 함께 제공한다.
 */

export type StatPeriodKey = "today" | "7d" | "30d" | "month" | "custom";

export interface StatPeriod {
  key: StatPeriodKey;
  label: string;
  from: Date;
  to: Date;
}

export function resolvePeriod(
  key: StatPeriodKey,
  custom?: { from: string; to: string },
): StatPeriod {
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  switch (key) {
    case "today":
      return { key, label: "오늘", from: startOfDay(now), to: endOfToday };
    case "7d":
      return {
        key,
        label: "최근 7일",
        from: startOfDay(new Date(now.getTime() - 6 * 86400000)),
        to: endOfToday,
      };
    case "30d":
      return {
        key,
        label: "최근 30일",
        from: startOfDay(new Date(now.getTime() - 29 * 86400000)),
        to: endOfToday,
      };
    case "month":
      return {
        key,
        label: "이번 달",
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: endOfToday,
      };
    case "custom": {
      const from = custom?.from ? new Date(custom.from) : startOfDay(now);
      const to = custom?.to ? new Date(`${custom.to}T23:59:59`) : endOfToday;
      return { key, label: "사용자 지정", from, to };
    }
  }
}

export interface StatMetric {
  id: string;
  label: string;
  value: string;
  /** 기준 정의 caption */
  definition: string;
  rawValue: number | null;
}

export interface TrendPoint {
  dateLabel: string;
  total: number;
  emergency: number;
}

export interface RegionCount {
  region: string;
  count: number;
}

export interface StatisticsResult {
  period: StatPeriod;
  metrics: StatMetric[];
  trend: TrendPoint[];
  regions: RegionCount[];
  /** 집계 대상 사건 수가 0인 경우 */
  isEmpty: boolean;
}

function within(report: OperatorReport, period: StatPeriod): boolean {
  const t = new Date(report.submittedAt).getTime();
  return t >= period.from.getTime() && t <= period.to.getTime();
}

function firstEventAt(report: OperatorReport, statuses: string[]): string | null {
  const event = report.timeline.find((e) => statuses.includes(e.status));
  return event?.occurredAt ?? null;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export const METRIC_DEFINITIONS = {
  total: "기간 내 접수 시각 기준 전체 제보 수 (병합된 원 제보 포함)",
  emergency: "현재 트리아지가 '응급 의심'인 제보 수",
  firstResponse: "초동 대응 시간 = 접수 시각부터 확인 시작 시각까지",
  closure: "종결 시간 = 접수 시각부터 종결(부정 종결 포함) 시각까지",
  merged: "운영자가 중복으로 확정해 병합한 제보 수",
  overrideRate:
    "AI 판정 번복률 = 운영자가 AI 최초 판정을 변경한 사건 수 ÷ AI 판정 완료 사건 수",
} as const;

export function computeStatistics(
  reports: OperatorReport[],
  period: StatPeriod,
): StatisticsResult {
  const inPeriod = reports.filter((r) => within(r, period));

  const firstResponseTimes: number[] = [];
  const closureTimes: number[] = [];
  let emergencyCount = 0;
  let mergedCount = 0;
  let aiJudged = 0;
  let overridden = 0;

  for (const report of inPeriod) {
    if (report.triage.currentType === "emergency") emergencyCount += 1;
    if (report.mergedIntoReportId) mergedCount += 1;
    if (
      report.triage.originalType !== "analyzing" &&
      report.triage.originalType !== "unavailable"
    ) {
      aiJudged += 1;
      if (report.triage.overriddenAt) overridden += 1;
    }
    const reviewingAt = firstEventAt(report, ["reviewing"]);
    if (reviewingAt) {
      const m = minutesBetween(report.submittedAt, reviewingAt);
      if (m !== null) firstResponseTimes.push(m);
    }
    const closedAt = firstEventAt(report, ["closed", "negative_closed"]);
    if (closedAt) {
      const m = minutesBetween(report.submittedAt, closedAt);
      if (m !== null) closureTimes.push(m);
    }
  }

  const avgFirst = mean(firstResponseTimes);
  const avgClosure = mean(closureTimes);
  const overrideRate = aiJudged > 0 ? (overridden / aiJudged) * 100 : null;

  const formatMinutes = (v: number | null) => {
    if (v === null) return "데이터 없음";
    if (v < 60) return `${Math.round(v)}분`;
    const h = Math.floor(v / 60);
    const m = Math.round(v % 60);
    return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  };

  const metrics: StatMetric[] = [
    {
      id: "total",
      label: "총 제보 수",
      value: `${inPeriod.length}건`,
      definition: METRIC_DEFINITIONS.total,
      rawValue: inPeriod.length,
    },
    {
      id: "emergency",
      label: "응급 건수",
      value: `${emergencyCount}건`,
      definition: METRIC_DEFINITIONS.emergency,
      rawValue: emergencyCount,
    },
    {
      id: "firstResponse",
      label: "평균 초동 대응 시간",
      value: formatMinutes(avgFirst),
      definition: METRIC_DEFINITIONS.firstResponse,
      rawValue: avgFirst,
    },
    {
      id: "closure",
      label: "평균 종결 시간",
      value: formatMinutes(avgClosure),
      definition: METRIC_DEFINITIONS.closure,
      rawValue: avgClosure,
    },
    {
      id: "merged",
      label: "중복 병합 건수",
      value: `${mergedCount}건`,
      definition: METRIC_DEFINITIONS.merged,
      rawValue: mergedCount,
    },
    {
      id: "overrideRate",
      label: "AI 판정 번복률",
      value: overrideRate === null ? "데이터 없음" : `${overrideRate.toFixed(1)}%`,
      definition: METRIC_DEFINITIONS.overrideRate,
      rawValue: overrideRate,
    },
  ];

  /* 일 단위 추이 */
  const trend: TrendPoint[] = [];
  const dayMs = 86400000;
  const startDay = new Date(
    period.from.getFullYear(),
    period.from.getMonth(),
    period.from.getDate(),
  );
  const totalDays = Math.max(
    1,
    Math.min(31, Math.ceil((period.to.getTime() - startDay.getTime()) / dayMs)),
  );
  for (let i = 0; i < totalDays; i += 1) {
    const dayStart = new Date(startDay.getTime() + i * dayMs);
    const dayEnd = new Date(dayStart.getTime() + dayMs);
    const inDay = inPeriod.filter((r) => {
      const t = new Date(r.submittedAt).getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime();
    });
    trend.push({
      dateLabel: `${dayStart.getMonth() + 1}/${dayStart.getDate()}`,
      total: inDay.length,
      emergency: inDay.filter((r) => r.triage.currentType === "emergency").length,
    });
  }

  /* 지역별 분포 — 집계 화면이므로 정확 좌표는 사용하지 않는다. */
  const regionMap = new Map<string, number>();
  for (const report of inPeriod) {
    const region = report.location.address.includes("서귀포시")
      ? "서귀포시"
      : report.location.address.includes("제주시")
        ? "제주시"
        : "기타";
    regionMap.set(region, (regionMap.get(region) ?? 0) + 1);
  }
  const regions = Array.from(regionMap.entries())
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count);

  return { period, metrics, trend, regions, isEmpty: inPeriod.length === 0 };
}
