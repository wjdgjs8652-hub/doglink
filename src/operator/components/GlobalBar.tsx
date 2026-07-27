import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { formatAbsoluteSeconds } from "../../lib/date-time";
import { EmergencyCounter } from "./EmergencyCounter";
import "./GlobalBar.css";

export interface GlobalBarProps {
  organizationName?: string;
  operatorName?: string;
  emergencyCount: number;
  oldestEmergencyMinutes?: number;
  lastUpdatedAt?: string;
  isRefreshing?: boolean;
  soundEnabled: boolean;
  onEmergencyClick: () => void;
  onRefresh: () => void;
  onToggleSound: () => void;
  onLogout: () => void;
}

/** 상단 고정 GlobalBar (56px): 서비스명 · 응급 카운터 · 갱신 · 계정 */
export function GlobalBar({
  organizationName,
  operatorName,
  emergencyCount,
  oldestEmergencyMinutes,
  lastUpdatedAt,
  isRefreshing = false,
  soundEnabled,
  onEmergencyClick,
  onRefresh,
  onToggleSound,
  onLogout,
}: GlobalBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    if (!menuOpen) return;
    const onOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  const isQueue = location.pathname.startsWith("/operator/queue");
  const isStats = location.pathname.startsWith("/operator/statistics");

  return (
    <header className="global-bar">
      <div className="global-bar__brand">
        <span className="global-bar__logo" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="1.5" y="1.5" width="17" height="17" rx="4.5" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="7" cy="9" r="1.3" fill="currentColor" />
            <circle cx="13" cy="9" r="1.3" fill="currentColor" />
            <path d="M7.4 13.2c1.6 1.2 3.6 1.2 5.2 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
        <span className="global-bar__title">DOG-LINK 운영자 콘솔</span>
        {organizationName && (
          <span className="global-bar__org">{organizationName}</span>
        )}
      </div>

      <nav className="global-bar__nav" aria-label="운영 화면">
        <Link
          to="/operator/queue"
          className={`global-bar__nav-link ${isQueue ? "global-bar__nav-link--active" : ""}`}
          aria-current={isQueue ? "page" : undefined}
        >
          제보 큐
        </Link>
        <Link
          to="/operator/statistics"
          className={`global-bar__nav-link ${isStats ? "global-bar__nav-link--active" : ""}`}
          aria-current={isStats ? "page" : undefined}
        >
          통계·보고
        </Link>
      </nav>

      <div className="global-bar__status">
        <EmergencyCounter
          count={emergencyCount}
          oldestWaitingMinutes={oldestEmergencyMinutes}
          onActivate={onEmergencyClick}
        />
        <div className="global-bar__refresh">
          {lastUpdatedAt && (
            <span className="global-bar__updated tabular-nums">
              갱신 {formatAbsoluteSeconds(lastUpdatedAt).slice(11)}
            </span>
          )}
          <button
            type="button"
            className="global-bar__icon-btn"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label={isRefreshing ? "갱신 중" : "수동 새로고침"}
            title="수동 새로고침"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className={isRefreshing ? "global-bar__spin" : undefined}
            >
              <path d="M13.6 8a5.6 5.6 0 11-1.7-4M12 1.6v2.8H9.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="global-bar__account" ref={menuRef}>
          <button
            type="button"
            className="global-bar__account-btn"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="global-bar__avatar" aria-hidden="true">
              {operatorName?.slice(0, 1) ?? "?"}
            </span>
            <span className="global-bar__account-name">{operatorName}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {menuOpen && (
            <div className="global-bar__menu" role="menu">
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={soundEnabled}
                className="global-bar__menu-item"
                onClick={() => {
                  onToggleSound();
                  setMenuOpen(false);
                }}
              >
                응급 알림음 {soundEnabled ? "켜짐" : "꺼짐"}
              </button>
              <Link
                to="/operator/design-system"
                role="menuitem"
                className="global-bar__menu-item"
                onClick={() => setMenuOpen(false)}
              >
                디자인 시스템
              </Link>
              <button
                type="button"
                role="menuitem"
                className="global-bar__menu-item global-bar__menu-item--danger"
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
