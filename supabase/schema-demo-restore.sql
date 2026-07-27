-- ═══════════════════════════════════════════════════════════════════
-- 데모 모드 복원 (schema-hardening.sql을 되돌림)
-- mock 계정(admin / jeju.kim 등) 로그인으로 운영자 콘솔을 쓰려면
-- anon 역할의 조회·갱신을 다시 허용해야 한다.
-- SQL Editor에 이 파일 내용만 붙여넣고 Run.
-- (운영자용 강화 정책·allowlist는 남겨둬도 무해 — 나중에 재전환 가능)
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists "demo anon read reports" on public.reports;
create policy "demo anon read reports" on public.reports
  for select to anon using (true);

drop policy if exists "demo anon update reports" on public.reports;
create policy "demo anon update reports" on public.reports
  for update to anon using (true) with check (true);

drop policy if exists "demo anon read events" on public.report_events;
create policy "demo anon read events" on public.report_events
  for select to anon using (true);
