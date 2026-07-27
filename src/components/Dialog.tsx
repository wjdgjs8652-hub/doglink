import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import "./Dialog.css";

export interface DialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  /** 하단 버튼 영역 */
  footer?: ReactNode;
  onClose: () => void;
  /** 파괴적 확인 다이얼로그 등에서 배경 클릭 닫기를 막을 때 */
  disableBackdropClose?: boolean;
  width?: number;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * 공용 모달 다이얼로그.
 * - 포커스 트랩, Esc 닫기, 닫은 뒤 이전 포커스 복원
 * - 시민·운영자 서비스가 함께 사용한다.
 */
export function Dialog({
  open,
  title,
  children,
  footer,
  onClose,
  disableBackdropClose = false,
  width = 440,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    if (panel) {
      const first = panel.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel).focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      );
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && active === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (!disableBackdropClose && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className="dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{ maxWidth: width }}
      >
        <div className="dialog-panel__header">
          <h2 className="dialog-panel__title">{title}</h2>
          <button
            type="button"
            className="dialog-panel__close"
            aria-label="닫기"
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="dialog-panel__body">{children}</div>
        {footer && <div className="dialog-panel__footer">{footer}</div>}
      </div>
    </div>
  );
}
