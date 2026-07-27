-- ═══════════════════════════════════════════════════════════════════
-- DOG-LINK Supabase 스키마
-- Supabase 대시보드 → SQL Editor에서 이 파일 전체를 실행하세요.
--
-- ⚠ MVP 데모 등급 보안 주의
--   운영자 인증(Supabase Auth)이 아직 없어 anon 키로 조회·갱신을 허용합니다.
--   실제 운영 배포 전 반드시:
--   1) 운영자 계정을 Supabase Auth로 전환
--   2) UPDATE/전체 SELECT 정책을 authenticated 운영자 role로 제한
--   3) 시민 조회는 reports_public 뷰(정확 좌표 제외)만 허용
-- ═══════════════════════════════════════════════════════════════════

-- 제보 본문
create table if not exists public.reports (
  report_id            text primary key,                 -- 예: JJ-4818 (무작위, 증가 숫자 아님)
  submitted_at         timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  -- AI 트리아지
  triage_type          text not null check (triage_type in ('emergency','dispatch','negative','unavailable')),
  triage_summary       text not null default '',
  triage_analyzed_at   timestamptz,

  -- 처리 상태 (운영자 콘솔과 시민 S7이 공유하는 어휘)
  processing_status    text not null default 'submitted'
    check (processing_status in ('submitted','reviewing','transferred','dispatched','protected','returned','negative_closed','closed')),
  assignee_name        text,

  -- 위치 (정확 좌표는 기관 처리용 — 시민 공개 화면에서는 사용 금지)
  latitude             double precision,
  longitude            double precision,
  address              text,
  location_source      text check (location_source in ('gps','search','manual')),
  public_location_label text not null default '위치 정보 없음',
  public_radius_m      integer not null default 500,

  -- 제보 내용
  situations           text[] not null default '{}',
  description          text not null default '',
  photos               jsonb not null default '[]',      -- [{ "url": "..." }]
  emergency_reported   boolean not null default false,

  -- 처리 단계별 타임스탬프 (submitted/triaged/reviewing/transferred/dispatched/closed)
  stamps               jsonb not null default '{}'
);

-- 감사 로그 / 타임라인 이벤트
create table if not exists public.report_events (
  id          bigint generated always as identity primary key,
  report_id   text not null references public.reports(report_id) on delete cascade,
  action      text not null,          -- report_created / assigned / status_changed / triage_overridden / closed ...
  actor_name  text not null default 'DOG-LINK 시스템',
  before      text,
  after       text,
  reason      text,
  occurred_at timestamptz not null default now()
);

create index if not exists report_events_report_id_idx on public.report_events (report_id, occurred_at);
create index if not exists reports_submitted_at_idx on public.reports (submitted_at desc);

-- 시민 상태 확인(S7)용 공개 뷰 — 정확 좌표·주소·담당자를 제외
create or replace view public.reports_public as
  select report_id, submitted_at, updated_at,
         triage_type, triage_summary, triage_analyzed_at,
         processing_status, public_location_label, public_radius_m,
         emergency_reported, stamps
  from public.reports;

-- ── RLS (데모 등급 — 상단 주의 참고) ──
alter table public.reports enable row level security;
alter table public.report_events enable row level security;

drop policy if exists "demo anon read reports" on public.reports;
create policy "demo anon read reports" on public.reports
  for select to anon using (true);

drop policy if exists "demo anon insert reports" on public.reports;
create policy "demo anon insert reports" on public.reports
  for insert to anon with check (true);

drop policy if exists "demo anon update reports" on public.reports;
create policy "demo anon update reports" on public.reports
  for update to anon using (true) with check (true);

drop policy if exists "demo anon read events" on public.report_events;
create policy "demo anon read events" on public.report_events
  for select to anon using (true);

drop policy if exists "demo anon insert events" on public.report_events;
create policy "demo anon insert events" on public.report_events
  for insert to anon with check (true);

-- ── 사진 저장소 버킷 ──
insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', true)
on conflict (id) do nothing;

drop policy if exists "demo anon upload report photos" on storage.objects;
create policy "demo anon upload report photos" on storage.objects
  for insert to anon with check (bucket_id = 'report-photos');

drop policy if exists "public read report photos" on storage.objects;
create policy "public read report photos" on storage.objects
  for select to anon using (bucket_id = 'report-photos');
