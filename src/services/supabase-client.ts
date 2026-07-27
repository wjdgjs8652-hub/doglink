/**
 * Supabase REST 클라이언트 (경량 — 라이브러리 없이 PostgREST/Storage 직접 호출).
 * URL과 anon 키는 환경 변수로만 주입한다 (.env / Vercel 환경 변수).
 * 미설정 시 isSupabaseConfigured=false — 각 서비스는 mock adapter로 폴백한다.
 * anon 키는 클라이언트 공개용 키이며, service_role 키는 절대 프런트엔드에 두지 않는다.
 */
/* trim: 배포 환경 변수에 섞일 수 있는 BOM·공백 문자를 방어적으로 제거 */
const url = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

export const isSupabaseConfigured = Boolean(url && anonKey);

export class SupabaseRestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function authHeaders(): Record<string, string> {
  return { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
}

/** PostgREST 호출. 204 응답은 null을 반환한다. */
export async function sbRest<T>(
  path: string,
  init: RequestInit & { headers?: Record<string, string> } = {},
): Promise<T | null> {
  const res = await fetch(`${url}/rest/v1${path}`, {
    ...init,
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new SupabaseRestError(res.status, await res.text().catch(() => ""));
  }
  // 201/204 + Prefer: return=minimal 응답은 본문이 비어 있다
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : null;
}

/** Storage 업로드 후 공개 URL을 반환한다. */
export async function sbUpload(
  bucket: string,
  path: string,
  blob: Blob,
  contentType: string,
): Promise<{ publicUrl: string }> {
  const res = await fetch(
    `${url}/storage/v1/object/${bucket}/${path}`,
    {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": contentType },
      body: blob,
    },
  );
  if (!res.ok) {
    throw new SupabaseRestError(res.status, await res.text().catch(() => ""));
  }
  return { publicUrl: `${url}/storage/v1/object/public/${bucket}/${path}` };
}
