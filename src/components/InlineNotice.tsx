import type { ReactNode } from "react";
import "./InlineNotice.css";

export type InlineNoticeVariant = "info" | "warning" | "success" | "error";

export interface InlineNoticeProps {
  variant: InlineNoticeVariant;
  children: ReactNode;
  /** 상태 변화 안내가 필요한 경우 polite/assertive 설정 */
  live?: "polite" | "assertive";
}

const ICONS: Record<InlineNoticeVariant, JSX.Element> = {
  info: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 7.4v3.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="5.2" r="0.9" fill="currentColor" />
    </svg>
  ),
  warning: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.8L14.6 13.4H1.4L8 1.8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 6.2v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="11.2" r="0.9" fill="currentColor" />
    </svg>
  ),
  success: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.2 8.2l2 2 3.6-4.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
};

export function InlineNotice({ variant, children, live }: InlineNoticeProps) {
  return (
    <div
      className={`inline-notice inline-notice--${variant}`}
      role={variant === "error" ? "alert" : undefined}
      aria-live={live}
    >
      <span className="inline-notice__icon">{ICONS[variant]}</span>
      <div className="inline-notice__body">{children}</div>
    </div>
  );
}
