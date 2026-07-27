import "./EmergencyCounter.css";

export interface EmergencyCounterProps {
  count: number;
  oldestWaitingMinutes?: number;
  onActivate: () => void;
}

/**
 * 글로벌 응급 미처리 카운터.
 * 어떤 필터·화면에서도 항상 노출되며, 클릭 시 응급 필터를 적용한다.
 */
export function EmergencyCounter({
  count,
  oldestWaitingMinutes = 0,
  onActivate,
}: EmergencyCounterProps) {
  const showElapsed = count > 0 && oldestWaitingMinutes >= 15;
  const label =
    count === 0
      ? "응급 미처리 0건"
      : showElapsed
        ? `응급 ${count}건 · 최장 ${oldestWaitingMinutes}분 경과`
        : `응급 미처리 ${count}건`;

  return (
    <button
      type="button"
      className={`emergency-counter ${count > 0 ? "emergency-counter--active" : "emergency-counter--neutral"}`}
      onClick={onActivate}
      aria-live="assertive"
      aria-label={`${label}. 클릭하면 응급 필터를 적용합니다.`}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M7 1.2L13 12H1L7 1.2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M7 5.4v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="7" cy="10.2" r="0.8" fill="currentColor" />
      </svg>
      <span className="tabular-nums">{label}</span>
    </button>
  );
}
