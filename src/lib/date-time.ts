/**
 * 날짜·시간 공통 유틸리티.
 * 사건번호·시간 표기는 시민·운영자 서비스가 같은 규칙을 사용한다.
 */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** "2026-07-27 14:20" */
export function formatAbsolute(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "2026-07-27 14:20:31" (응급 이벤트 등 초 단위 표시) */
export function formatAbsoluteSeconds(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${formatAbsolute(iso)}:${pad(d.getSeconds())}`;
}

/** 스크린리더용 "2026년 7월 27일 14시 20분" */
export function formatSpoken(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${d.getHours()}시 ${d.getMinutes()}분`;
}

/** "방금 전" | "12분 전" | "3시간 전" | "2일 전" */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = now.getTime() - d.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

export function minutesSince(iso: string, now: Date = new Date()): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 60000));
}

/** 분 단위 소요 시간을 "17분" | "2시간 5분" | "3일 4시간"으로 표시 */
export function formatDurationMinutes(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return "-";
  const minutes = Math.round(totalMinutes);
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest > 0 ? `${hours}시간 ${rest}분` : `${hours}시간`;
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours > 0 ? `${days}일 ${restHours}시간` : `${days}일`;
}

export function minutesBetween(fromIso: string, toIso: string): number | null {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return Math.max(0, (to - from) / 60000);
}

/** CSV 파일명 등에 쓰는 "20260727-1420" */
export function formatFileStamp(d: Date = new Date()): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}
