-- ═══════════════════════════════════════════════════════════════════
-- DOG-LINK 보안 강화 (schema.sql 적용 후 실행)
--
-- 적용 결과:
--   시민(anon)   : 제보 INSERT + 좌표 제외 공개 뷰(reports_public) SELECT만 가능
--   운영자(auth) : Supabase Auth 로그인 + operator_allowlist 등록 계정만
--                  reports 전체 SELECT/UPDATE, 감사 로그 조회·기록 가능
--   그 외 계정   : 스스로 가입해도 allowlist에 없으면 아무 데이터 접근 불가
--
-- 실행 전 준비 (Supabase 대시보드):
--   1) Authentication → Users → Add user 로 운영자 계정 생성
--      (이메일 + 비밀번호, "Auto Confirm User" 체크)
--   2) 아래 맨 아래 allowlist INSERT의 이메일을 실제 계정으로 수정
-- ═══════════════════════════════════════════════════════════════════

-- ── 운영자 허용 목록 ──
create table if not exists public.operator_allowlist (
  email             text primary key,
  display_name      text not null,
  organization_name text not null default ''
);

alter table public.operator_allowlist enable row level security;

-- 로그인한 운영자가 자기 프로필(표시 이름·소속)만 읽을 수 있다
drop policy if exists "operator reads own row" on public.operator_allowlist;
create policy "operator reads own row" on public.operator_allowlist
  for select to authenticated using (email = auth.email());

-- 허용 목록 검사 함수 (security definer — 정책 안에서 목록을 확인)
create or replace function public.is_operator()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.operator_allowlist where email = auth.email()
  );
$$;

-- ── reports: 데모 등급 정책 제거 → 운영자 전용으로 강화 ──
-- 시민 접수(INSERT) 정책은 유지한다
drop policy if exists "demo anon read reports" on public.reports;
drop policy if exists "demo anon update reports" on public.reports;

drop policy if exists "operators read reports" on public.reports;
create policy "operators read reports" on public.reports
  for select to authenticated using (public.is_operator());

drop policy if exists "operators update reports" on public.reports;
create policy "operators update reports" on public.reports
  for update to authenticated
  using (public.is_operator()) with check (public.is_operator());

-- ── report_events: 조회는 운영자 전용, 기록은 시민 접수(anon)와 운영자 모두 ──
drop policy if exists "demo anon read events" on public.report_events;

drop policy if exists "operators read events" on public.report_events;
create policy "operators read events" on public.report_events
  for select to authenticated using (public.is_operator());

drop policy if exists "operators insert events" on public.report_events;
create policy "operators insert events" on public.report_events
  for insert to authenticated with check (public.is_operator());

-- ── 시민 공개 뷰: 소유자 권한으로 실행되어 좌표 제외 컬럼만 노출 ──
alter view public.reports_public set (security_invoker = off);
grant select on public.reports_public to anon, authenticated;

-- ── 운영자 등록 (이메일을 실제 생성한 계정으로 교체·추가) ──
insert into public.operator_allowlist (email, display_name, organization_name) values
  ('bule1541@gmail.com', '총괄 운영자', '제주특별자치도 동물방역과')
on conflict (email) do update
  set display_name = excluded.display_name,
      organization_name = excluded.organization_name;

-- 참고: Authentication → Sign In / Up 에서 신규 가입(Sign up)을 꺼두면
-- 외부인이 계정을 만드는 것 자체를 차단할 수 있습니다 (allowlist가 이미
-- 데이터 접근을 막지만, 이중 방어로 권장).
