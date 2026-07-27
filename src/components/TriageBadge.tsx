import "./TriageBadge.css";

export type TriageVariant =
  | "emergency"
  | "dispatch"
  | "negative"
  | "analyzing"
  | "unavailable";

export interface TriageBadgeProps {
  variant: TriageVariant;
  size?: "default" | "large";
}

/** 색상 + 아이콘 + 한글 라벨을 항상 함께 표시한다. */
const TRIAGE_META: Record<TriageVariant, { label: string; icon: JSX.Element }> = {
  emergency: {
    label: "응급 의심",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M7 1.2L13 12H1L7 1.2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M7 5.4v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="7" cy="10.2" r="0.8" fill="currentColor" />
      </svg>
    ),
  },
  dispatch: {
    label: "확인 필요",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="5.6" stroke="currentColor" strokeWidth="1.4" />
        <path d="M7 4v3.4l2.2 1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  negative: {
    label: "대응 낮음",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="5.6" stroke="currentColor" strokeWidth="1.4" />
        <path d="M4.4 7h5.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  analyzing: {
    label: "AI 분석 중",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M7 1.4a5.6 5.6 0 105.6 5.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  unavailable: {
    label: "판정 불가",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="5.6" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5.2 5.4a1.8 1.8 0 113 1.3c-.6.5-1.2.8-1.2 1.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="7" cy="10.4" r="0.8" fill="currentColor" />
      </svg>
    ),
  },
};

export function TriageBadge({ variant, size = "default" }: TriageBadgeProps) {
  const meta = TRIAGE_META[variant];
  return (
    <span
      className={`triage-badge triage-badge--${variant} triage-badge--${size}`}
    >
      <span
        className={
          variant === "analyzing"
            ? "triage-badge__icon triage-badge__icon--spin"
            : "triage-badge__icon"
        }
      >
        {meta.icon}
      </span>
      {meta.label}
    </span>
  );
}
