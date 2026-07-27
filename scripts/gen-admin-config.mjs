/**
 * 운영자 콘솔(정적 파일) 런타임 설정 생성기.
 * Vite 환경 변수(VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)를 읽어
 * operator/js/ 와 public/admin/js/ 에 runtime-config.js를 생성한다.
 *
 * - anon 키는 클라이언트 공개용 키다 (service_role 금지)
 * - 생성 파일은 .gitignore 대상 — 소스에 키를 커밋하지 않는다
 * - 미설정 시 window.DOGLINK_CONFIG = {} → 콘솔은 mock 전용 모드
 *
 * package.json의 predev/prebuild에서 자동 실행된다.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// .env / .env.local 로드 (Vercel에서는 process.env로 주입됨)
for (const name of [".env", ".env.local"]) {
  const p = join(root, name);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const url = process.env.VITE_SUPABASE_URL || "";
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || "";

const body = `/* 자동 생성 파일 — 편집·커밋 금지 (scripts/gen-admin-config.mjs) */
window.DOGLINK_CONFIG = ${
  url && anonKey
    ? JSON.stringify({ supabaseUrl: url, supabaseAnonKey: anonKey })
    : "{}"
};
`;

for (const dir of ["operator/js", "public/admin/js"]) {
  const target = join(root, dir);
  mkdirSync(target, { recursive: true });
  writeFileSync(join(target, "runtime-config.js"), body);
}

console.log(
  url && anonKey
    ? "[gen-admin-config] Supabase 설정 주입 완료"
    : "[gen-admin-config] Supabase 미설정 — 운영자 콘솔은 mock 전용 모드",
);
