# Supabase 데이터베이스 설정 가이드

시민 제보를 Supabase(PostgreSQL)에 저장하고 운영자 콘솔 큐에 실시간 반영하는 구성입니다.
환경 변수가 없으면 시민 앱·운영자 콘솔 모두 기존 **브라우저 mock 모드로 자동 폴백**합니다.

## 아키텍처

```text
시민 제보 앱 (React)                    운영자 콘솔 (정적 JS)
  reportService.submit ──┐               ┌── 30초 폴링으로 큐 동기화
  사진 → Storage 업로드    │               │   상태 변경 → PATCH 반영
                         ▼               ▼
              Supabase (PostgreSQL + Storage)
                reports / report_events / report-photos 버킷
                         ▲
  시민 상태 확인(S7) ──────┘  reports_public 뷰 (정확 좌표 제외)
```

- 시민 앱: [src/services/supabase-client.ts](../src/services/supabase-client.ts), [report-service.ts](../src/services/report-service.ts), [upload-service.ts](../src/services/upload-service.ts)
- 운영자 콘솔: [operator/js/supabase-adapter.js](../operator/js/supabase-adapter.js) (REST 직접 호출, 라이브러리 없음)
- 스키마: [supabase/schema.sql](../supabase/schema.sql)

## 설정 순서 (약 5분)

1. **프로젝트 생성** — [supabase.com](https://supabase.com) 가입 후 New Project (무료 플랜으로 충분)
2. **스키마 실행** — 대시보드 → SQL Editor → `supabase/schema.sql` 내용 전체 붙여넣고 Run
   - `reports`, `report_events` 테이블 + `reports_public` 뷰 + `report-photos` 스토리지 버킷 + RLS 정책이 생성됩니다
3. **키 확인** — Project Settings → API에서 `Project URL`과 `anon public` 키 복사
4. **로컬 개발** — 프로젝트 루트에 `.env` 생성:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
5. **Vercel 배포** — 환경 변수 2개를 Vercel 프로젝트에 추가 후 재배포:
   ```bash
   npx vercel env add VITE_SUPABASE_URL production
   npx vercel env add VITE_SUPABASE_ANON_KEY production
   npx vercel deploy --prod
   ```

주의: Vite는 환경 변수를 **빌드 시점**에 주입합니다. 변수 추가·변경 후에는 반드시 재빌드(재배포)해야 반영됩니다. 운영자 콘솔용 설정 파일(`runtime-config.js`)도 빌드 시 `scripts/gen-admin-config.mjs`가 자동 생성합니다.

## 데이터 흐름

| 시점 | 동작 |
|---|---|
| 시민 사진 업로드(S2) | `report-photos` 버킷에 EXIF 제거된 JPEG 업로드 |
| 시민 접수(S5→S6) | `reports` insert (`processing_status: submitted`, 응급 자동신고는 `transferred`) + `report_events`에 접수 로그 |
| 시민 상태 확인(S7) | `reports_public` 뷰 조회 — **정확 좌표·주소 미포함** |
| 운영자 콘솔 로그인 후 | 30초 주기로 reports/report_events 폴링 → 큐에 병합, 신규 응급 건 토스트 |
| 운영자 상태 변경·배정 | `reports` PATCH(상태·담당자·stamps) + `report_events` insert → 시민 S7에 반영 |

운영자 콘솔의 기존 시연용 시드 11건은 메모리 데이터로 함께 표시됩니다(사건번호가 겹치지 않음). 실데이터 제보는 외형 특징 입력이 없어 **중복·실종 매칭 후보 산정에서 제외**됩니다.

## ⚠ 보안 — 데모 등급임을 유의

현재 운영자 인증이 mock이므로 RLS를 anon 역할에 넓게 허용했습니다. 즉 **anon 키를 아는 누구나 데이터를 읽고 상태를 바꿀 수 있습니다** (정확 좌표 포함). 공개 시연 이상의 용도로 쓰기 전에 반드시:

1. 운영자 로그인을 Supabase Auth로 전환
2. `reports` 전체 SELECT/UPDATE를 authenticated 운영자 role로 제한
3. 시민(anon)에게는 INSERT + `reports_public` 뷰 SELECT만 허용
4. Storage 업로드에 용량·확장자 제한 추가
