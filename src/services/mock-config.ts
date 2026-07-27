/**
 * mock 모드 플래그.
 * 실제 백엔드·지도 SDK·AI API가 연결되면 환경 변수 기반으로 전환한다.
 * (docs/mock-api.md 참고)
 */
export const isMockMode = true;

/** mock 지연 헬퍼 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateId(prefix = ""): string {
  return `${prefix}${Math.random().toString(36).slice(2, 10)}`;
}
