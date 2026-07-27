/* ═══════════════════════════════════════════════════════════════════
   DOG-LINK 운영자 콘솔 — Supabase adapter
   시민 제보(reports 테이블)를 제보 큐로 불러오고, 운영자의 상태 변경을
   다시 Supabase에 반영해 시민 상태 확인(S7)과 동기화한다.

   설정은 js/runtime-config.js(빌드 시 환경 변수에서 생성, 커밋 금지)의
   window.DOGLINK_CONFIG에서 읽는다. 미설정 시 이 파일은 아무것도 하지
   않고 콘솔은 기존 mock 시드 데이터로만 동작한다.

   ⚠ anon 키 기반 데모 등급 — 실제 운영 전 Supabase Auth + RLS 강화 필요
   (supabase/schema.sql 상단 주의 참고)
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const cfg = window.DOGLINK_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return; /* mock 전용 모드 */

  const OP = window.OP;
  const POLL_MS = 30000;

  /* 강화 RLS 모드에서는 로그인한 운영자의 토큰으로 조회·갱신한다.
     토큰이 없으면 anon — 시민 공개 범위(INSERT·공개 뷰)만 접근 가능 */
  function buildHeaders() {
    const userToken = OP.auth && OP.auth.accessToken ? OP.auth.accessToken() : null;
    return {
      apikey: cfg.supabaseAnonKey,
      Authorization: `Bearer ${userToken || cfg.supabaseAnonKey}`,
      "Content-Type": "application/json",
    };
  }

  let sessionNotified = false;
  async function rest(path, opts = {}) {
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1${path}`, {
      ...opts,
      headers: Object.assign({}, buildHeaders(), opts.headers || {}),
    });
    if (res.status === 401) {
      /* 사용자 토큰 만료 — 세션을 종료해 재로그인 유도 */
      if (OP.auth && OP.auth.accessToken() && !sessionNotified) {
        sessionNotified = true;
        if (window.DL && window.DL.toast) {
          window.DL.toast("인증이 만료되었어요. 다시 로그인해 주세요.", "error");
        }
        if (OP.auth.expireNow) OP.auth.expireNow();
      }
      throw new Error("Supabase 401");
    }
    if (!res.ok) throw new Error(`Supabase ${res.status}`);
    /* 201/204 + Prefer: return=minimal 응답은 본문이 비어 있다 */
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  /* ── 좌표 → 콘솔 지도(제주 SVG viewBox 720×380) 좌표 ── */
  function toMapXY(lat, lng) {
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    if (typeof lat !== "number" || typeof lng !== "number") {
      return { x: 360, y: 200 }; /* 좌표 없음 — 중앙 표시 */
    }
    return {
      x: clamp(84 + ((lng - 126.16) / 0.79) * 566, 84, 650),
      y: clamp(88 + ((33.56 - lat) / 0.36) * 228, 88, 316),
    };
  }

  const SITUATION_LABELS = {
    injured: "다쳐 보여요", "not-moving": "움직이지 않아요",
    leashed: "목줄이 있어요", "avoids-people": "사람을 피해요",
    "near-road": "도로 근처에 있어요", aggressive: "공격적인 행동을 보여요",
    puppy: "새끼로 보여요", multiple: "여러 마리가 함께 있어요",
  };

  /* 콘솔 상태 → 시민 타임라인 step id (src/services/report-service.ts와 동일 규칙) */
  const STEP_OF = {
    submitted: "submitted", reviewing: "reviewing", transferred: "transferred",
    dispatched: "dispatched", protected: "dispatched",
    returned: "closed", negative_closed: "closed", closed: "closed",
  };

  function operatorByName(name) {
    const found = (OP.MOCK.OPERATORS || []).find((o) => o.displayName === name);
    return found || (name ? { id: `remote-${name}`, displayName: name, organizationName: "" } : undefined);
  }

  /* ── Supabase 행 → 콘솔 report 객체 매핑 ── */
  function mapRow(row, events) {
    const submittedAt = new Date(row.submitted_at);
    const updatedAt = new Date(row.updated_at);
    const xy = toMapXY(row.latitude, row.longitude);
    const address = row.address || row.public_location_label || "주소 미확인";
    const region = address.includes("서귀포") ? "서귀포시" : "제주시";
    const tags = (row.situations || []).map((id) => SITUATION_LABELS[id] || id);
    const triageType = row.triage_type === "unavailable" ? "analyzing" : row.triage_type;

    const photos = (Array.isArray(row.photos) ? row.photos : [])
      .filter((p) => p && typeof p.url === "string")
      .map((p, i) => ({
        id: `${row.report_id}-P${i + 1}`, url: p.url,
        coat: "회색", patt: "",
        alt: `${row.report_id} 시민 제보 사진 ${i + 1}`,
      }));
    if (!photos.length) {
      photos.push({ id: `${row.report_id}-P1`, coat: "회색", patt: "", alt: "사진 없음" });
    }

    /* 타임라인: stamps 기반 + 이벤트 로그 병합 */
    const stamps = row.stamps || {};
    const timeline = [];
    let tSeq = 0;
    ["submitted", "reviewing", "transferred", "dispatched", "closed"].forEach((step) => {
      if (!stamps[step]) return;
      const status = step === "closed"
        ? (["returned", "negative_closed", "closed"].includes(row.processing_status) ? row.processing_status : "closed")
        : (step === "dispatched" && row.processing_status === "protected" ? "protected" : step);
      timeline.push({
        id: `SB-${row.report_id}-${++tSeq}`, status,
        occurredAt: new Date(stamps[step]),
        actor: step === "submitted" ? OP.MOCK.SYSTEM : (operatorByName(row.assignee_name) || OP.MOCK.SYSTEM),
      });
    });

    const auditLog = (events || []).map((e) => ({
      id: `SB-AUD-${e.id}`, reportId: row.report_id, action: e.action,
      actor: { id: `remote-${e.actor_name}`, displayName: e.actor_name },
      occurredAt: new Date(e.occurred_at),
      before: e.before, after: e.after, reason: e.reason,
    }));

    return {
      reportId: row.report_id, remote: true, stamps,
      submittedAt, updatedAt, photos,
      location: {
        latitude: row.latitude, longitude: row.longitude,
        address, mapX: xy.x, mapY: xy.y, region,
      },
      reporterContext: {
        observedAt: submittedAt,
        description: row.description || "",
        situationTags: tags,
      },
      triage: {
        originalType: triageType, currentType: triageType,
        summary: row.triage_summary || "AI 분석 결과가 없습니다.",
        confidence: null,
        analyzedAt: row.triage_analyzed_at ? new Date(row.triage_analyzed_at) : submittedAt,
      },
      status: row.processing_status,
      assignee: operatorByName(row.assignee_name),
      timeline, auditLog,
      isEmergencyAutoSubmitted: !!row.emergency_reported,
      linkedReportIds: [],
      /* 시민 제보에는 외형 특징 입력이 없어 매칭 후보 산정에서 제외한다 */
      featuresUnknown: true,
      features: { coat: "미상", size: "미상", patt: "미상", collar: "미상" },
      aiSummary: row.triage_summary || (row.description || "").slice(0, 40) || "시민 제보",
    };
  }

  /* ── 원격 → 로컬 큐 병합 ── */
  let pulling = false;
  async function pull() {
    if (pulling) return;
    pulling = true;
    try {
      const [rows, events] = await Promise.all([
        rest("/reports?select=*&order=submitted_at.desc&limit=200"),
        rest("/report_events?select=*&order=occurred_at.asc&limit=2000"),
      ]);
      const byReport = {};
      (events || []).forEach((e) => (byReport[e.report_id] = byReport[e.report_id] || []).push(e));

      const hadEmergencyIds = new Set(
        OP.reports.filter((r) => r.remote && r.triage.currentType === "emergency").map((r) => r.reportId),
      );
      const knownIds = new Set(OP.reports.filter((r) => r.remote).map((r) => r.reportId));

      /* 기존 원격 행 제거 후 최신 상태로 재삽입 (푸시 직후 pull과의 충돌 방지) */
      for (let i = OP.reports.length - 1; i >= 0; i--) {
        if (OP.reports[i].remote) OP.reports.splice(i, 1);
      }
      (rows || []).forEach((row) => {
        const r = mapRow(row, byReport[row.report_id]);
        OP.reports.push(r);
        /* 새로 도착한 응급 건 알림 */
        if (r.triage.currentType === "emergency" && !knownIds.has(r.reportId) && !hadEmergencyIds.has(r.reportId) && !firstPull) {
          if (OP.pushEmergencyToast) OP.pushEmergencyToast(r);
        }
      });
      firstPull = false;
      OP.realtime.refresh(); /* queue.refreshed 이벤트로 UI 갱신 */
    } catch (err) {
      /* 네트워크 실패 시 조용히 다음 주기에 재시도 — 콘솔은 로컬 데이터로 계속 동작 */
      console.warn("[supabase-adapter] 동기화 실패:", err.message);
    } finally {
      pulling = false;
    }
  }
  let firstPull = true;

  /* ── 로컬 변경 → 원격 반영 ── */
  const PUSH_EVENTS = new Set(["report.status_changed", "report.assigned", "report.updated"]);
  async function push(r) {
    const nowIso = new Date().toISOString();
    r.stamps = r.stamps || {};
    const step = STEP_OF[r.status];
    if (step && !r.stamps[step]) r.stamps[step] = nowIso;

    const last = r.auditLog[r.auditLog.length - 1];
    try {
      await rest(`/reports?report_id=eq.${encodeURIComponent(r.reportId)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          processing_status: r.status,
          assignee_name: r.assignee ? r.assignee.displayName : null,
          triage_type: r.triage.currentType === "analyzing" ? "unavailable" : r.triage.currentType,
          triage_summary: r.triage.summary,
          updated_at: nowIso,
          stamps: r.stamps,
        }),
      });
      if (last && !last.synced) {
        last.synced = true;
        await rest("/report_events", {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            report_id: r.reportId, action: last.action,
            actor_name: last.actor ? last.actor.displayName : "운영자",
            before: last.before != null ? String(last.before) : null,
            after: last.after != null ? String(last.after) : null,
            reason: last.reason || null,
            occurred_at: nowIso,
          }),
        });
      }
    } catch (err) {
      console.warn("[supabase-adapter] 변경 반영 실패 (다음 동기화에서 재시도):", err.message);
      if (window.DL && window.DL.toast) {
        window.DL.toast("서버 반영에 실패했어요. 네트워크 확인 후 다시 시도해 주세요.", "error");
      }
    }
  }

  OP.subscribe((ev) => {
    if (!PUSH_EVENTS.has(ev.type) || pulling) return;
    const r = OP.getReport(ev.reportId);
    if (r && r.remote) push(r);
  });

  /* ── 부팅 ── */
  OP.supabaseSync = { pull, enabled: true };
  pull();
  setInterval(pull, POLL_MS);
})();
