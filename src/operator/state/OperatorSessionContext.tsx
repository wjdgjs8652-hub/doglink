import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authService } from "../services/auth-service";
import type { OperatorSession } from "../services/auth-service";
import type { OperatorSummary } from "../types";

interface OperatorSessionContextValue {
  session: OperatorSession | null;
  operator: OperatorSummary | null;
  login: (accountId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** 세션이 만료되어 로그아웃된 경우 true (로그인 화면 안내용) */
  expired: boolean;
  clearExpired: () => void;
}

const OperatorSessionContext = createContext<OperatorSessionContextValue | null>(
  null,
);

export function OperatorSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<OperatorSession | null>(() =>
    authService.getSession(),
  );
  const [expired, setExpired] = useState(false);

  /* 주기적 만료 검사 + 사용자 활동 시 세션 연장 */
  useEffect(() => {
    if (!session) return;
    const check = () => {
      const current = authService.getSession();
      if (!current) {
        setSession(null);
        setExpired(true);
      }
    };
    const interval = window.setInterval(check, 30_000);
    const onActivity = () => authService.touch();
    window.addEventListener("click", onActivity);
    window.addEventListener("keydown", onActivity);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("click", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [session]);

  const login = useCallback(async (accountId: string, password: string) => {
    const next = await authService.login(accountId, password);
    setExpired(false);
    setSession(next);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setSession(null);
  }, []);

  const clearExpired = useCallback(() => setExpired(false), []);

  const value = useMemo<OperatorSessionContextValue>(
    () => ({
      session,
      operator: session?.operator ?? null,
      login,
      logout,
      expired,
      clearExpired,
    }),
    [session, login, logout, expired, clearExpired],
  );

  return (
    <OperatorSessionContext.Provider value={value}>
      {children}
    </OperatorSessionContext.Provider>
  );
}

export function useOperatorSession(): OperatorSessionContextValue {
  const ctx = useContext(OperatorSessionContext);
  if (!ctx) {
    throw new Error("useOperatorSession은 OperatorSessionProvider 안에서 사용해야 합니다.");
  }
  return ctx;
}

/** 로그인 전 보호 라우트. 원래 경로를 returnUrl로 보존한다. */
export function RequireOperatorAuth({ children }: { children: ReactNode }) {
  const { session } = useOperatorSession();
  const location = useLocation();
  if (!session) {
    const returnUrl = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/operator/login?return=${encodeURIComponent(returnUrl)}`}
        replace
      />
    );
  }
  return <>{children}</>;
}
