/* ═══════════════════════════════════════════════════════════════════
   DOG-LINK 운영자 콘솔 — 서비스 계층 (adapter + mock)
   실제 API·SSO·지도 SDK·발송 채널이 없는 환경이므로 전부 mock adapter다.
   UI는 이 인터페이스만 사용한다 — 실제 연동 시 이 파일의 구현만 교체한다.
   연동 필요 지점은 docs/operator-mock-api.md에 정리되어 있다.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const OP = window.OP;

  /* ══════════ 저장소 (mock — 메모리, 영속화 없음) ══════════ */
  const reports = OP.MOCK.REPORTS.slice();
  const missing = OP.MOCK.MISSING.slice();
  let seq = 4824;

  const listeners = new Set();
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function emit(event) { listeners.forEach(fn => fn(event)); }

  const getReport = id => reports.find(r => r.reportId === id) || null;
  const getMissing = id => missing.find(m => m.id === id) || null;

  /* ══════════ 인증 adapter ══════════
     기본은 mock 계정(시연용). runtime-config에 operatorAuth: "supabase"가
     설정되면 Supabase Auth(실계정 이메일 로그인) + operator_allowlist 검증으로
     전환된다 — supabase/schema-hardening.sql 적용 후 사용.
     토큰 하드코딩 없음 — 세션은 sessionStorage에 만료 시각과 함께 저장. */
  const SESSION_KEY = "doglink-operator-session";
  const SESSION_MINUTES = 30;
  const CFG = window.DOGLINK_CONFIG || {};
  const USE_SUPA_AUTH = Boolean(
    CFG.supabaseUrl && CFG.supabaseAnonKey && CFG.operatorAuth === "supabase");
  /* mock 계정 — 시연용. 실제 계정 체계가 아니다.
     admin(총괄) 계정도 기능 권한은 동일하다 — 요구사항 문서에 직급·권한 체계가 없으므로
     별도 권한 등급을 만들지 않는다 (운영자 프롬프트 §17). */
  const MOCK_ACCOUNTS = [
    { loginId: "admin",     password: "doglink-super", operatorId: "op-admin" },
    { loginId: "jeju.kim",  password: "doglink-demo", operatorId: "op-kim"  },
    { loginId: "jeju.park", password: "doglink-demo", operatorId: "op-park" },
    { loginId: "jeju.lee",  password: "doglink-demo", operatorId: "op-lee"  },
  ];

  function writeSession(session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  /* Supabase Auth 로그인 + 운영자 허용 목록 검증 */
  async function supaLogin(email, password) {
    try {
      const res = await fetch(`${CFG.supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: CFG.supabaseAnonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      /* 실패 사유(계정 존재 여부 등)를 구분해 노출하지 않는다 */
      if (!res.ok) return { ok: false, message: "계정 정보를 확인하고 다시 시도해 주세요." };
      const tok = await res.json();
      const pr = await fetch(
        `${CFG.supabaseUrl}/rest/v1/operator_allowlist?select=email,display_name,organization_name&email=eq.${encodeURIComponent(email)}`,
        { headers: { apikey: CFG.supabaseAnonKey, Authorization: `Bearer ${tok.access_token}` } });
      const rows = pr.ok ? await pr.json() : [];
      if (!rows.length) {
        return { ok: false, message: "운영자 권한이 없는 계정입니다. 관리자에게 문의해 주세요." };
      }
      writeSession({
        profile: {
          id: `supa-${rows[0].email}`,
          displayName: rows[0].display_name,
          organizationName: rows[0].organization_name || "",
        },
        accessToken: tok.access_token,
        expiresAt: Date.now() + SESSION_MINUTES * 60000,
      });
      return { ok: true };
    } catch {
      return { ok: false, message: "인증 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요." };
    }
  }

  const auth = {
    useSupabase: USE_SUPA_AUTH,
    /* 항상 Promise를 반환한다 (mock은 즉시 해석) */
    async login(loginId, password) {
      if (USE_SUPA_AUTH) return supaLogin(loginId.trim(), password);
      const acc = MOCK_ACCOUNTS.find(a => a.loginId === loginId.trim() && a.password === password);
      /* 실패 사유(계정 존재 여부 등)를 구분해 노출하지 않는다 */
      if (!acc) return { ok: false, message: "계정 정보를 확인하고 다시 시도해 주세요." };
      writeSession({ operatorId: acc.operatorId, expiresAt: Date.now() + SESSION_MINUTES * 60000 });
      return { ok: true };
    },
    currentSession() {
      try {
        const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
        if (!s) return null;
        if (Date.now() > s.expiresAt) { sessionStorage.removeItem(SESSION_KEY); return { expired: true }; }
        return s;
      } catch { return null; }
    },
    currentUser() {
      const s = auth.currentSession();
      if (!s || s.expired) return null;
      if (s.profile) return s.profile; /* Supabase Auth 세션 */
      return OP.MOCK.OPERATORS.find(o => o.id === s.operatorId) || null;
    },
    /* Supabase 데이터 접근용 사용자 토큰 (미로그인·mock 모드면 null) */
    accessToken() {
      const s = auth.currentSession();
      return s && !s.expired && s.accessToken ? s.accessToken : null;
    },
    touch() { /* 활동 시 세션 연장 */
      const s = auth.currentSession();
      if (s && !s.expired) {
        s.expiresAt = Date.now() + SESSION_MINUTES * 60000;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
      }
    },
    logout() { sessionStorage.removeItem(SESSION_KEY); },
    expireNow() { /* 세션 만료 시연용 */
      const s = auth.currentSession();
      if (s) { s.expiresAt = 0; sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
    },
  };

  /* ══════════ 감사 로그 ══════════
     상태 변경·번복·병합·종결은 반드시 로그와 함께 원자적으로 기록한다.
     mock 저장소는 동기 메모리 연산이므로 한 함수 안에서 함께 반영해 원자성을 보장한다.
     실제 백엔드에서는 서버 트랜잭션이 필요하다 (docs/operator-mock-api.md). */
  let auditSeq = 1000;
  function writeAudit(report, action, extra = {}) {
    const entry = Object.assign({
      id: `AUD-${++auditSeq}`, reportId: report.reportId, action,
      actor: auth.currentUser() || OP.MOCK.SYSTEM, occurredAt: new Date(),
    }, extra);
    report.auditLog.push(entry);
    return entry;
  }

  /* ══════════ 상태 전환 서비스 ══════════ */
  let eventSeq = 100;
  function requestTransition(reportId, target, opts = {}) {
    const r = getReport(reportId);
    if (!r) return { ok: false, message: "사건을 찾을 수 없습니다. 큐를 새로고침해 주세요." };
    /* UI 비활성화와 별개로 데이터 계층에서 다시 검증 */
    if (!OP.canTransition(r.status, target))
      return { ok: false, message: `현재 상태(${window.DL.STATUS_META[r.status].label})에서 허용되지 않는 전환입니다.` };

    const me = auth.currentUser();
    if (!me) return { ok: false, message: "로그인 세션이 없습니다. 다시 로그인해 주세요." };

    const before = r.status;
    let autoAssigned = false;
    /* 담당자 미배정 사건 변경 시 현재 사용자에게 자동 배정 + 고지 */
    if (!r.assignee) {
      r.assignee = me;
      autoAssigned = true;
      writeAudit(r, "assigned", { after: me.displayName, reason: "상태 변경에 따른 자동 배정" });
    }
    r.status = target;
    r.updatedAt = new Date();
    r.timeline.push({ id: `E-${++eventSeq}`, status: target, occurredAt: r.updatedAt, actor: me });
    if (target === "closed" || target === "negative_closed") {
      r.closure = {
        result: opts.result || (target === "negative_closed" ? "negative" : "other"),
        memo: opts.memo || "",
        closedAt: r.updatedAt, closedBy: me,
      };
      writeAudit(r, "closed", { before, after: target, reason: OP.CLOSURE_RESULTS[r.closure.result] + (opts.memo ? ` — ${opts.memo}` : "") });
    } else {
      writeAudit(r, "status_changed", { before, after: target, reason: opts.reason });
    }
    emit({ type: "report.status_changed", reportId });
    /* 시민 상태 페이지(S7) 연동 — mock에서는 같은 저장소의 투영이 곧 갱신이다 */
    return { ok: true, autoAssigned, report: r };
  }

  function assignToMe(reportId) {
    const r = getReport(reportId);
    const me = auth.currentUser();
    if (!r || !me) return { ok: false, message: "배정할 수 없습니다." };
    if (r.assignee && r.assignee.id === me.id) return { ok: false, message: "이미 나에게 배정된 사건입니다." };
    const before = r.assignee ? r.assignee.displayName : null;
    r.assignee = me;
    r.updatedAt = new Date();
    writeAudit(r, "assigned", { before, after: me.displayName });
    emit({ type: "report.assigned", reportId });
    return { ok: true };
  }

  /* ══════════ AI 판정 번복 (O4-R) ══════════
     원 판정은 originalType에 보존되고 절대 덮어쓰지 않는다. 사유 필수. */
  function overrideTriage(reportId, newType, reason, note) {
    const r = getReport(reportId);
    if (!r) return { ok: false, message: "사건을 찾을 수 없습니다." };
    if (!OP.OVERRIDE_REASONS[reason]) return { ok: false, message: "번복 사유를 선택해 주세요." };
    if (reason === "other" && !(note || "").trim()) return { ok: false, message: "기타 사유의 내용을 입력해 주세요." };
    if (newType === r.triage.currentType) return { ok: false, message: "현재 판정과 같은 값입니다." };
    const me = auth.currentUser();
    const before = r.triage.currentType;
    r.triage.currentType = newType;
    r.triage.overriddenAt = new Date();
    r.triage.overriddenBy = me;
    r.triage.overrideReason = reason;
    r.triage.overrideNote = note || "";
    r.updatedAt = new Date();
    writeAudit(r, "triage_overridden", {
      before, after: newType,
      reason: OP.OVERRIDE_REASONS[reason] + (note ? ` — ${note}` : ""),
    });
    emit({ type: "report.updated", reportId });
    return { ok: true };
  }

  /* ══════════ 중복·실종 매칭 (O4-M) ══════════ */
  const MATCH_WEIGHTS = { coat: 30, patt: 20, size: 15, collar: 10, dist: 15, time: 10 };
  function matchScore(r, cand) {
    const f = r.features, ev = [];
    let score = 0;
    if (f.coat === cand.coat) { score += MATCH_WEIGHTS.coat; ev.push({ key: "털색", hit: true, text: `털색 일치 (${f.coat})` }); }
    else ev.push({ key: "털색", hit: false, text: `털색 다름 (${f.coat}/${cand.coat})` });
    if (f.patt === cand.patt) { score += MATCH_WEIGHTS.patt; ev.push({ key: "무늬", hit: true, text: `무늬 일치 (${f.patt})` }); }
    else ev.push({ key: "무늬", hit: false, text: "무늬 다름" });
    if (f.size === cand.size) { score += MATCH_WEIGHTS.size; ev.push({ key: "크기", hit: true, text: `크기 일치 (${f.size})` }); }
    else ev.push({ key: "크기", hit: false, text: "크기 다름" });
    if (f.collar === cand.collar) { score += MATCH_WEIGHTS.collar; ev.push({ key: "목줄", hit: true, text: `목줄 일치 (${f.collar})` }); }
    else ev.push({ key: "목줄", hit: false, text: "목줄 다름" });
    const cx = cand.x ?? cand.location?.mapX, cy = cand.y ?? cand.location?.mapY;
    const km = Math.round(Math.hypot(r.location.mapX - cx, r.location.mapY - cy) * 0.11 * 10) / 10;
    if (km <= 3) score += MATCH_WEIGHTS.dist; else if (km <= 10) score += MATCH_WEIGHTS.dist / 2;
    ev.push({ key: "거리", hit: km <= 3, text: `거리 약 ${km}km` });
    const candAt = cand.reportedAt || cand.submittedAt;
    const dtMin = Math.abs(r.submittedAt - candAt) / 60000;
    if (dtMin <= 360) score += MATCH_WEIGHTS.time; else if (dtMin <= 1440) score += MATCH_WEIGHTS.time / 2;
    ev.push({ key: "시간차", hit: dtMin <= 360, text: `시간차 ${window.DL.durText(dtMin * 60000)}` });
    return { score: Math.round(score), evidence: ev, distanceKm: km, timeDiffMinutes: Math.round(dtMin) };
  }
  /* AI는 후보를 제안만 한다 — 자동 병합·자동 연결 경로 없음. 상위 3건 */
  function candidatesFor(reportId) {
    const r = getReport(reportId);
    if (!r || r.mergedIntoReportId) return [];
    /* 외형 특징이 없는 시민 실데이터 제보는 자동 매칭 후보 산정에서 제외 */
    if (r.featuresUnknown) return [];
    const pool = [];
    reports.forEach(o => {
      if (o.reportId === r.reportId || o.mergedIntoReportId || o.featuresUnknown) return;
      const m = matchScore(r, Object.assign({}, o.features,
        { x: o.location.mapX, y: o.location.mapY, submittedAt: o.submittedAt }));
      pool.push({ candidateId: o.reportId, candidateType: "report", ref: o,
        photo: o.photos[0], when: o.submittedAt, place: o.location.address, ...m });
    });
    missing.forEach(mi => {
      const m = matchScore(r, mi);
      pool.push({ candidateId: mi.id, candidateType: "missing_report", ref: mi,
        photo: { coat: mi.coat, patt: mi.patt, alt: `실종견 ${mi.name}의 등록 사진` },
        when: mi.reportedAt, place: mi.place, ...m });
    });
    const decisions = r.matchDecisions || {};
    return pool
      .filter(c => c.score >= 45 && !decisions[c.candidateId])
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }
  function decideMatch(reportId, candidateId, decision, opts = {}) {
    const r = getReport(reportId);
    if (!r) return { ok: false, message: "사건을 찾을 수 없습니다." };
    const me = auth.currentUser();
    r.matchDecisions = r.matchDecisions || {};
    r.matchDecisions[candidateId] = { decision, actor: me, at: new Date() };
    r.updatedAt = new Date();
    if (decision === "link") {
      if (!r.linkedReportIds.includes(candidateId)) r.linkedReportIds.push(candidateId);
      const other = getReport(candidateId);
      if (other && !other.linkedReportIds.includes(reportId)) other.linkedReportIds.push(reportId);
      writeAudit(r, "report_linked", { after: candidateId, reason: opts.reason || "같은 개체로 판단" });
    } else if (decision === "merge") {
      /* 병합 — 원 사건은 삭제하지 않고 대표 사건으로의 포인터만 남긴다 */
      const dup = getReport(candidateId);
      if (!dup) return { ok: false, message: "제보 사건만 병합할 수 있습니다." };
      dup.mergedIntoReportId = reportId;
      dup.updatedAt = new Date();
      writeAudit(r, "report_merged", { after: candidateId, reason: "중복 제보 병합 (대표 사건 유지)" });
      writeAudit(dup, "report_merged", { after: reportId, reason: `대표 사건 ${reportId}(으)로 병합됨 — 원 기록 보존` });
    } else {
      writeAudit(r, "match_rejected", { after: candidateId, reason: "무관 판정" });
    }
    emit({ type: decision === "merge" ? "report.merged" : "report.updated", reportId });
    return { ok: true };
  }

  /* 보호자 알림 (mock notification adapter) — 실제 문자·푸시 발송 없음 */
  function notifyGuardian(reportId, missingId) {
    const r = getReport(reportId);
    if (!r) return { ok: false };
    writeAudit(r, "guardian_notified", {
      after: missingId,
      reason: "보호자 알림 발송 확인 (mock — 실제 발송 채널 미연동)",
    });
    emit({ type: "report.updated", reportId });
    return { ok: true, mock: true };
  }

  /* ══════════ 큐 서비스 — 필터·정렬 ══════════ */
  const TRIAGE_ORDER = { emergency: 0, dispatch: 1, analyzing: 2, unavailable: 2, negative: 3 };
  const DEFAULT_HIDDEN = ["closed", "negative_closed"];

  function emptyFilters() {
    return { triage: [], statuses: [], regions: [], assigneeIds: [],
      assignedToMe: false, dateFrom: "", dateTo: "", query: "" };
  }
  function queueList(filters) {
    const f = filters || emptyFilters();
    const me = auth.currentUser();
    const q = (f.query || "").trim().toLowerCase();
    let rows = reports.filter(r => {
      if (r.mergedIntoReportId) return false; /* 병합된 사건은 대표 사건에서 확인 */
      /* 종결·부정 종결은 기본 숨김 — 상태 필터로 명시하면 조회 가능 */
      if (!f.statuses.length && DEFAULT_HIDDEN.includes(r.status)) return false;
      if (f.statuses.length && !f.statuses.includes(r.status)) return false;
      if (f.triage.length && !f.triage.includes(r.triage.currentType)) return false;
      if (f.regions.length && !f.regions.includes(r.location.region)) return false;
      if (f.assigneeIds.length && !(r.assignee && f.assigneeIds.includes(r.assignee.id))) return false;
      if (f.assignedToMe && !(me && r.assignee && r.assignee.id === me.id)) return false;
      if (f.dateFrom && r.submittedAt < new Date(f.dateFrom + "T00:00:00")) return false;
      if (f.dateTo && r.submittedAt > new Date(f.dateTo + "T23:59:59")) return false;
      if (q && !(r.reportId.toLowerCase().includes(q) ||
                 r.location.address.toLowerCase().includes(q) ||
                 r.aiSummary.toLowerCase().includes(q))) return false;
      return true;
    });
    /* 기본 정렬: 응급 → 출동 → 대기·확인 필요 → 부정, 같은 우선순위는 오래된 순.
       응급은 어떤 정렬에서도 최상단 고정 */
    rows.sort((a, b) => {
      const ta = TRIAGE_ORDER[a.triage.currentType], tb = TRIAGE_ORDER[b.triage.currentType];
      if (ta !== tb) return ta - tb;
      return a.submittedAt - b.submittedAt;
    });
    return rows;
  }

  /* 응급 미처리 = 트리아지 응급이면서 아직 확인이 시작되지 않은(접수됨) 사건.
     현재 필터와 무관하게 전체 기준으로 센다. */
  function emergencySummary() {
    const list = reports.filter(r => !r.mergedIntoReportId &&
      r.triage.currentType === "emergency" && r.status === "submitted");
    const oldest = list.length ? Math.min(...list.map(r => r.submittedAt.getTime())) : null;
    return {
      count: list.length,
      oldestWaitingMinutes: oldest == null ? null : Math.floor((Date.now() - oldest) / 60000),
      reports: list.sort((a, b) => a.submittedAt - b.submittedAt),
    };
  }

  /* ══════════ 시민 상태 페이지(S7) 데이터 계약 ══════════
     시민 응답에는 정확 좌표·상세 주소·담당자 연락처가 포함되지 않는다.
     화면에서 가리는 것이 아니라 응답에서 제거한다. */
  function citizenView(reportId) {
    const r = getReport(reportId);
    if (!r) return null;
    const stage = OP.citizenStageOf(r.status);
    return {
      접수번호: r.reportId,
      처리단계: stage.label,
      단계번호: stage.stage,
      단계이력: OP.CITIZEN_STAGE_LABEL.map((lab, i) => ({ 단계: lab, 도달: i <= stage.stage })),
      위치범위: `${r.location.region} 인근 (약 300m 범위)`, /* 정확 좌표 제거 */
      접수시각: window.DL.ymdhm(r.submittedAt),
      최근갱신: window.DL.ymdhm(r.updatedAt),
    };
  }

  /* ══════════ 실시간 adapter (mock event stream) ══════════
     실제 서비스에서는 SSE/WebSocket. 여기서는 주기 polling 시각 갱신과
     시연 이벤트 트리거(신규 제보 주입)만 제공한다 — 실제 연동처럼 속이지 않는다. */
  let lastUpdatedAt = new Date();
  const realtime = {
    lastUpdatedAt: () => lastUpdatedAt,
    refresh() { lastUpdatedAt = new Date(); emit({ type: "queue.refreshed" }); },
    startPolling(intervalMs = 30000) {
      setInterval(() => realtime.refresh(), intervalMs);
    },
    /* 시연용 신규 제보 주입 (kind: "normal" | "emergency") */
    injectDemo(kind) {
      const tpl = OP.MOCK.INCOMING_TEMPLATES[kind === "emergency" ? 1 : 0];
      const id = `JJ-${++seq}`;
      const nowD = new Date();
      const ll = (tpl.lat != null && tpl.lng != null)
        ? { latitude: tpl.lat, longitude: tpl.lng }
        : OP.MOCK.toLatLng(tpl.x, tpl.y);
      const r = {
        reportId: id, submittedAt: nowD, updatedAt: nowD,
        photos: [{ id: `${id}-P1`, coat: tpl.coat, patt: tpl.patt, alt: `${tpl.address} 인근에서 촬영된 ${tpl.coat} ${tpl.size} (시연용 신규 제보)` }],
        location: { latitude: ll.latitude, longitude: ll.longitude, address: tpl.address, mapX: tpl.x + Math.round((seq % 5) - 2) * 6, mapY: tpl.y, region: tpl.region },
        reporterContext: { observedAt: nowD, description: tpl.desc, situationTags: tpl.tags },
        triage: { originalType: tpl.triage, currentType: tpl.triage, summary: tpl.triBasis, confidence: tpl.conf, analyzedAt: nowD },
        status: "submitted", assignee: undefined,
        timeline: [{ id: `E-${++eventSeq}`, status: "submitted", occurredAt: nowD, actor: OP.MOCK.SYSTEM,
          note: tpl.auto ? "시민 확인 후 자동 접수" : undefined }],
        isEmergencyAutoSubmitted: !!tpl.auto,
        linkedReportIds: [], auditLog: [],
        features: { coat: tpl.coat, size: tpl.size, patt: tpl.patt, collar: tpl.collar },
        aiSummary: tpl.aiSummary,
      };
      r.auditLog.push({ id: `AUD-${++auditSeq}`, reportId: id, action: "report_created",
        actor: OP.MOCK.SYSTEM, occurredAt: nowD,
        reason: tpl.auto ? "응급 자동신고 — 시민 확인 후 자동 접수" : "시민 제보 접수" });
      reports.push(r);
      lastUpdatedAt = nowD;
      emit({ type: tpl.triage === "emergency" ? "report.emergency" : "report.created", reportId: id });
      return r;
    },
  };

  /* ══════════ 통계 서비스 (O7) ══════════ */
  function statistics(fromDate, toDate) {
    const from = fromDate.getTime(), to = toDate.getTime();
    const inRange = reports.filter(r => !r.mergedIntoReportId &&
      r.submittedAt.getTime() >= from && r.submittedAt.getTime() <= to);
    const evAt = (r, statuses) => {
      const e = r.timeline.find(e => statuses.includes(e.status));
      return e ? e.occurredAt.getTime() : null;
    };
    const firstResp = inRange
      .map(r => { const t = evAt(r, ["reviewing", "negative_closed"]); return t ? t - r.submittedAt.getTime() : null; })
      .filter(v => v != null);
    const closeDur = inRange
      .map(r => { const t = evAt(r, ["closed", "negative_closed"]); return t ? t - r.submittedAt.getTime() : null; })
      .filter(v => v != null);
    const analyzed = inRange.filter(r => r.triage.originalType !== "analyzing");
    const overridden = analyzed.filter(r => r.triage.overriddenAt);
    const mergedCount = reports.filter(r => r.mergedIntoReportId &&
      r.updatedAt.getTime() >= from && r.updatedAt.getTime() <= to).length;
    const avg = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
    /* 일자별 추이 */
    const byDay = new Map();
    inRange.forEach(r => {
      const k = window.DL.ymd(r.submittedAt);
      const d = byDay.get(k) || { date: k, total: 0, emergency: 0, dispatch: 0, negative: 0 };
      d.total++;
      const t = r.triage.currentType;
      if (t === "emergency") d.emergency++; else if (t === "dispatch") d.dispatch++; else if (t === "negative") d.negative++;
      byDay.set(k, d);
    });
    const byRegion = new Map();
    inRange.forEach(r => byRegion.set(r.location.region, (byRegion.get(r.location.region) || 0) + 1));
    return {
      total: inRange.length,
      emergency: inRange.filter(r => r.triage.currentType === "emergency").length,
      avgFirstResponseMs: avg(firstResp), firstResponseN: firstResp.length,
      avgCloseMs: avg(closeDur), closeN: closeDur.length,
      merged: mergedCount,
      overrideRate: analyzed.length ? overridden.length / analyzed.length : null,
      overrideN: overridden.length, analyzedN: analyzed.length,
      trend: [...byDay.values()].sort((a, b) => a.date < b.date ? -1 : 1),
      regions: [...byRegion.entries()].map(([region, count]) => ({ region, count })),
    };
  }

  /* ══════════ 내보내기 adapter ══════════
     CSV: 클라이언트 생성(실제 동작). PDF: 브라우저 인쇄 화면(서버 생성 미연동). */
  const exporter = {
    csv(filename, header, rows, metaLines = []) {
      const escCell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const lines = metaLines.map(l => escCell(l)).concat(
        [header.map(escCell).join(",")],
        rows.map(row => row.map(escCell).join(",")));
      /* BOM — 한글 Excel 호환 */
      const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    },
    printPdf() { window.print(); },
  };
  function logExport(kind) {
    /* 내보내기도 감사 대상 — 전체 로그 스트림에 기록 */
    const me = auth.currentUser() || OP.MOCK.SYSTEM;
    exportLog.push({ id: `AUD-${++auditSeq}`, action: "exported", actor: me, occurredAt: new Date(), reason: kind });
  }
  const exportLog = [];

  /* ══════════ 설정 (사운드 등) ══════════ */
  const SETTINGS_KEY = "doglink-operator-settings";
  const settings = {
    get() {
      try { return Object.assign({ sound: false }, JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}")); }
      catch { return { sound: false }; }
    },
    set(patch) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(Object.assign(settings.get(), patch)));
    },
  };

  Object.assign(OP, {
    auth, subscribe, getReport, getMissing,
    reports, missing,
    requestTransition, assignToMe, overrideTriage,
    candidatesFor, decideMatch, notifyGuardian,
    queueList, emptyFilters, emergencySummary, citizenView,
    realtime, statistics, exporter, logExport, exportLog, settings,
  });
})();
