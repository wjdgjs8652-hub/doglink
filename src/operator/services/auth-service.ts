import { delay } from "../../services/mock-config";
import type { OperatorSummary } from "../types";

/**
 * 기관 계정 인증 adapter.
 * 실제 공공 SSO/인증 서버가 연결되면 AuthService 구현만 교체한다.
 * (docs/operator-mock-api.md 참고 — 현재는 mock 세션)
 *
 * - 토큰·비밀번호를 소스에 실제 자격증명 형태로 하드코딩하지 않는다.
 *   아래 계정은 데모 전용 mock 계정이며 문서에 공개되어 있다.
 * - 로그인 실패 사유(계정 존재 여부/비밀번호 오류)는 구분해 노출하지 않는다.
 */

export interface OperatorSession {
  operator: OperatorSummary;
  issuedAt: string;
  expiresAt: string;
}

export class AuthenticationError extends Error {}
export class SessionExpiredError extends Error {}

export interface AuthService {
  login(accountId: string, password: string): Promise<OperatorSession>;
  logout(): Promise<void>;
  /** 만료된 세션은 null을 반환한다. */
  getSession(): OperatorSession | null;
  /** 사용자 활동 시 세션 연장 */
  touch(): void;
}

const SESSION_KEY = "doglink.operator.session.v1";
const SESSION_MINUTES = 60;

/** 데모용 mock 기관 계정 (실제 개인정보 아님) */
const MOCK_ACCOUNTS: Array<{
  accountId: string;
  password: string;
  operator: OperatorSummary;
}> = [
  {
    accountId: "jeju01",
    password: "doglink-demo",
    operator: {
      id: "op-kim",
      displayName: "김담당",
      organizationName: "제주시 동물보호팀",
    },
  },
  {
    accountId: "seogwipo01",
    password: "doglink-demo",
    operator: {
      id: "op-park",
      displayName: "박주무관",
      organizationName: "서귀포시 동물보호센터",
    },
  },
];

function readSession(): OperatorSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as OperatorSession) : null;
  } catch {
    return null;
  }
}

function writeSession(session: OperatorSession | null): void {
  if (session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

function buildSession(operator: OperatorSummary): OperatorSession {
  const now = new Date();
  return {
    operator,
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_MINUTES * 60000).toISOString(),
  };
}

const mockAuthService: AuthService = {
  async login(accountId, password) {
    await delay(500);
    const account = MOCK_ACCOUNTS.find(
      (a) => a.accountId === accountId.trim() && a.password === password,
    );
    if (!account) {
      /* 존재 여부·비밀번호 오류를 구분하지 않는 단일 문구 */
      throw new AuthenticationError("계정 정보를 확인하고 다시 시도해 주세요.");
    }
    const session = buildSession(account.operator);
    writeSession(session);
    return session;
  },

  async logout() {
    await delay(150);
    writeSession(null);
  },

  getSession() {
    const session = readSession();
    if (!session) return null;
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      writeSession(null);
      return null;
    }
    return session;
  },

  touch() {
    const session = readSession();
    if (!session) return;
    if (new Date(session.expiresAt).getTime() <= Date.now()) return;
    writeSession(buildSession(session.operator));
  },
};

export const authService: AuthService = mockAuthService;

/** 데모 안내용 (로그인 화면 mock 안내에만 사용) */
export const DEMO_ACCOUNT_HINT = {
  accountId: "jeju01",
  password: "doglink-demo",
};
