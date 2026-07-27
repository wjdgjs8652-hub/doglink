/* ═══════════════════════════════════════════════════════════════════
   DOG-LINK 운영자 콘솔 — 화면 계층
   O1 로그인 / O2 관제 홈·제보 큐 / O2-Map 지도 / O3 상세 / O4 판단·조치 /
   O5 상태 변경 / O6 종결 / O7 통계·보고 / 디자인 시스템 페이지
   라우팅·키보드·실시간 배선은 app.js가 담당한다.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const OP = window.OP, DL = window.DL, esc = DL.esc;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => [...(el || document).querySelectorAll(s)];

  /* ══════════ 콘솔 UI 상태 (URL query와 동기화) ══════════ */
  const ui = {
    filters: OP.emptyFilters(),
    view: "list",          /* list | map */
    selectedId: null,      /* 상세 패널에 열린 사건 */
    focusId: null,         /* 키보드 포커스 행 */
    auditSort: "desc",
    map: { z: 1, cx: 360, cy: 190 },
    busy: false,           /* 상태 변경 중 중복 클릭 방지 */
  };

  /* ── URL query 직렬화 — 새로고침·뒤로가기에서 필터·선택 복원 ── */
  function writeUrl(replace = true) {
    const f = ui.filters, p = new URLSearchParams();
    p.set("view", ui.view);
    if (ui.selectedId) p.set("reportId", ui.selectedId);
    if (f.triage.length) p.set("triage", f.triage.join(","));
    if (f.statuses.length) p.set("status", f.statuses.join(","));
    if (f.regions.length) p.set("region", f.regions.join(","));
    if (f.assigneeIds.length) p.set("assignee", f.assigneeIds.join(","));
    if (f.assignedToMe) p.set("me", "1");
    if (f.dateFrom) p.set("from", f.dateFrom);
    if (f.dateTo) p.set("to", f.dateTo);
    if (f.query) p.set("q", f.query);
    const hash = "#/queue?" + p.toString();
    if (replace) history.replaceState(null, "", hash); else history.pushState(null, "", hash);
  }
  function readUrl(params) {
    const f = OP.emptyFilters();
    const get = k => params.get(k) || "";
    const csv = k => get(k) ? get(k).split(",").filter(Boolean) : [];
    f.triage = csv("triage"); f.statuses = csv("status"); f.regions = csv("region");
    f.assigneeIds = csv("assignee"); f.assignedToMe = get("me") === "1";
    f.dateFrom = get("from"); f.dateTo = get("to"); f.query = get("q");
    ui.filters = f;
    ui.view = get("view") === "map" ? "map" : "list";
    ui.selectedId = get("reportId") || null;
  }

  /* ══════════ O1 로그인 ══════════ */
  function renderLogin(root, params) {
    const expired = params.get("expired") === "1";
    const returnTo = params.get("return") || "";
    root.innerHTML = `
    <div class="login-wrap">
      <div class="login-intro">
        <div class="logo">${DL.brandSymbolHTML(44)}<span>DogLink <span class="logo-suffix">운영자 콘솔</span></span></div>
        <p>유기견·유실견 발견 제보 연계 서비스의 기관 담당자용 관제 시스템입니다.
        시민 제보 큐 확인, AI 트리아지 검토, 상태 관리, 통계·보고 업무를 지원합니다.</p>
        <p style="font-size:12px;opacity:.75">지자체 · 동물보호센터 · 구조기관 담당자 전용</p>
      </div>
      <div class="login-form-area">
        <div class="login-card">
          <h1>기관 계정 로그인</h1>
          <p class="sub">기관 계정으로 로그인해 주세요. 공공 SSO 연동은 준비 중입니다.</p>
          <form id="loginForm" novalidate>
            <div class="field"><label for="lid">기관 계정 아이디</label>
              <input class="inp" id="lid" name="loginId" autocomplete="username" required></div>
            <div class="field"><label for="lpw">비밀번호</label>
              <input class="inp" id="lpw" name="password" type="password" autocomplete="current-password" required></div>
            <p class="login-msg ${expired ? "info" : ""}" id="loginMsg" role="alert">${
              expired ? "보안을 위해 로그인 세션이 종료되었습니다. 다시 로그인해 주세요." : ""}</p>
            <button class="btn primary" type="submit">로그인</button>
          </form>
          <div class="mock-hint">
            <b>시연용 mock 계정</b> — 실제 인증 서버가 연동되지 않은 데모 환경입니다.<br>
            아이디 <code>jeju.kim</code> / <code>jeju.park</code> / <code>jeju.lee</code> ·
            비밀번호 <code>doglink-demo</code><br>
            총괄 계정 <code>admin</code> · 비밀번호 <code>doglink-super</code>
          </div>
        </div>
      </div>
    </div>`;
    $("#loginForm").addEventListener("submit", e => {
      e.preventDefault();
      const res = OP.auth.login($("#lid").value, $("#lpw").value);
      if (!res.ok) {
        const m = $("#loginMsg"); m.classList.remove("info"); m.textContent = res.message;
        return;
      }
      location.hash = returnTo && returnTo.startsWith("#/") ? returnTo : "#/queue";
    });
    $("#lid").focus();
  }

  /* ══════════ GlobalBar ══════════ */
  function globalBarHTML(active) {
    const me = OP.auth.currentUser();
    const initial = me ? me.displayName.slice(0, 1) : "?";
    return `<header class="gbar">
      <button class="icon-btn fsb-toggle" id="fsbToggle" aria-label="필터 열기" title="필터">☰</button>
      <div class="brand">${DL.brandSymbolHTML(30)}
        <span class="brand-word">DogLink<small>운영자 콘솔 · ${esc(me ? me.organizationName : "")}</small></span></div>
      <nav aria-label="콘솔 화면">
        <a href="#/queue" ${active === "queue" ? 'aria-current="page"' : ""}>제보 큐</a>
        <a href="#/statistics" ${active === "stats" ? 'aria-current="page"' : ""}>통계·보고</a>
        <a href="#/design-system" ${active === "ds" ? 'aria-current="page"' : ""}>디자인 시스템</a>
      </nav>
      <div class="grow"></div>
      ${OP.emergencyCounterHTML()}
      <div class="refresh-meta" id="refreshMeta"></div>
      <button class="icon-btn" id="btnRefresh" aria-label="수동 새로고침" title="새로고침">⟳</button>
      <div class="account">
        <button id="accBtn" aria-haspopup="true" aria-expanded="false">
          <span class="avatar" aria-hidden="true">${esc(initial)}</span>${esc(me ? me.displayName : "")}</button>
      </div>
    </header>`;
  }
  function refreshMetaText() {
    return `<span class="upd-label">최근 갱신</span> <b class="mono">${esc(DL.hhmmss(OP.realtime.lastUpdatedAt()))}</b>
      <span class="upd-label" title="30초 주기 mock polling — 실제 서비스에서는 SSE/WebSocket">자동 갱신 중</span>`;
  }
  function bindGlobalBar(onEmergencyClick) {
    $("#btnRefresh").addEventListener("click", () => { OP.realtime.refresh(); DL.toast("큐를 새로고침했습니다."); });
    $("#emCounter").addEventListener("click", onEmergencyClick);
    const accBtn = $("#accBtn");
    accBtn.addEventListener("click", () => {
      const open = $(".menu-pop");
      if (open) { open.remove(); accBtn.setAttribute("aria-expanded", "false"); return; }
      const me = OP.auth.currentUser();
      const s = OP.settings.get();
      const pop = document.createElement("div");
      pop.className = "menu-pop";
      pop.innerHTML = `
        <div class="mi-head">${esc(me.displayName)} · ${esc(me.organizationName)}</div>
        <button class="mi" data-act="sound">${s.sound ? "🔔 응급 사운드 끄기" : "🔕 응급 사운드 켜기"}</button>
        <hr>
        <div class="mi-head">시연 도구 (mock 이벤트)</div>
        <button class="mi" data-act="demo-normal">＋ 신규 일반 제보 유입</button>
        <button class="mi" data-act="demo-em">🚨 신규 응급 제보 유입</button>
        <button class="mi" data-act="expire">⏱ 세션 만료 시연</button>
        <hr>
        <button class="mi" data-act="logout">로그아웃</button>`;
      pop.addEventListener("click", e => {
        const act = e.target.closest("[data-act]")?.dataset.act;
        if (!act) return;
        pop.remove(); accBtn.setAttribute("aria-expanded", "false");
        if (act === "sound") { OP.settings.set({ sound: !s.sound }); DL.toast(`응급 보조 사운드를 ${s.sound ? "껐" : "켰"}습니다.`); }
        if (act === "demo-normal") OP.realtime.injectDemo("normal");
        if (act === "demo-em") OP.realtime.injectDemo("emergency");
        if (act === "expire") { OP.auth.expireNow(); location.hash = `#/login?expired=1&return=${encodeURIComponent(location.hash)}`; }
        if (act === "logout") { OP.auth.logout(); location.hash = "#/login"; }
      });
      document.addEventListener("mousedown", function close(e) {
        if (!pop.contains(e.target) && e.target !== accBtn) { pop.remove(); accBtn.setAttribute("aria-expanded", "false"); document.removeEventListener("mousedown", close); }
      });
      accBtn.parentElement.appendChild(pop);
      accBtn.setAttribute("aria-expanded", "true");
    });
  }

  /* ══════════ O2 필터 사이드바 ══════════ */
  const TRIAGE_FILTERS = ["emergency", "dispatch", "negative", "analyzing"];
  const STATUS_FILTERS = ["submitted", "reviewing", "transferred", "dispatched", "protected", "returned", "negative_closed", "closed"];
  const REGIONS = ["제주시", "서귀포시"];

  function filterChips() {
    const f = ui.filters, chips = [];
    f.triage.forEach(t => chips.push({ k: "triage", v: t, label: `트리아지: ${DL.TRIAGE[t].label}` }));
    f.statuses.forEach(s => chips.push({ k: "statuses", v: s, label: `상태: ${DL.STATUS_META[s].label}` }));
    f.regions.forEach(r => chips.push({ k: "regions", v: r, label: `지역: ${r}` }));
    f.assigneeIds.forEach(id => {
      const o = OP.MOCK.OPERATORS.find(o => o.id === id);
      chips.push({ k: "assigneeIds", v: id, label: `담당: ${o ? o.displayName : id}` });
    });
    if (f.assignedToMe) chips.push({ k: "assignedToMe", v: "1", label: "나에게 배정된 건" });
    if (f.dateFrom) chips.push({ k: "dateFrom", v: f.dateFrom, label: `시작 ${f.dateFrom}` });
    if (f.dateTo) chips.push({ k: "dateTo", v: f.dateTo, label: `종료 ${f.dateTo}` });
    if (f.query) chips.push({ k: "query", v: f.query, label: `검색: ${f.query}` });
    return chips;
  }
  function sidebarHTML() {
    const f = ui.filters;
    const ck = (name, val, label, checked) =>
      `<label class="ck"><input type="checkbox" data-f="${name}" value="${esc(val)}" ${checked ? "checked" : ""}>${label}</label>`;
    const chips = filterChips();
    const rows = OP.queueList(f);
    return `<aside class="fsb" id="fsb" aria-label="필터">
      <h2>필터</h2>
      ${chips.length ? `<div class="fchips">${chips.map(c =>
        `<span class="fchip">${esc(c.label)}<button data-chip-k="${c.k}" data-chip-v="${esc(c.v)}" aria-label="${esc(c.label)} 필터 해제">✕</button></span>`).join("")}</div>` : ""}
      <p class="count-note">현재 조건 <b class="mono">${rows.length}</b>건
        <span style="color:var(--color-text-tertiary)">(종결·부정 종결은 기본 숨김)</span></p>
      <div class="fgroup"><h3>트리아지</h3>
        ${TRIAGE_FILTERS.map(t => ck("triage", t, DL.triageBadge(t, "sm"), f.triage.includes(t))).join("")}</div>
      <div class="fgroup"><h3>처리 상태</h3>
        ${STATUS_FILTERS.map(s => ck("statuses", s, esc(DL.STATUS_META[s].label), f.statuses.includes(s))).join("")}</div>
      <div class="fgroup"><h3>기간 (접수일)</h3>
        <label class="ck" style="display:block">시작 <input class="inp" type="date" data-f="dateFrom" value="${esc(f.dateFrom)}"></label>
        <label class="ck" style="display:block">종료 <input class="inp" type="date" data-f="dateTo" value="${esc(f.dateTo)}"></label></div>
      <div class="fgroup"><h3>지역</h3>
        ${REGIONS.map(r => ck("regions", r, esc(r), f.regions.includes(r))).join("")}</div>
      <div class="fgroup"><h3>담당자</h3>
        ${OP.MOCK.OPERATORS.map(o => ck("assigneeIds", o.id, esc(o.displayName), f.assigneeIds.includes(o.id))).join("")}
        ${ck("assignedToMe", "1", "<b>나에게 배정된 건</b>", f.assignedToMe)}</div>
      <button class="btn sm reset" id="fReset">필터 전체 초기화</button>
    </aside>`;
  }
  function bindSidebar() {
    const fsb = $("#fsb");
    fsb.addEventListener("change", e => {
      const el = e.target, key = el.dataset.f;
      if (!key) return;
      const f = ui.filters;
      if (key === "assignedToMe") f.assignedToMe = el.checked;
      else if (key === "dateFrom" || key === "dateTo") f[key] = el.value;
      else {
        const arr = f[key];
        if (el.checked) { if (!arr.includes(el.value)) arr.push(el.value); }
        else f[key] = arr.filter(v => v !== el.value);
      }
      applyFilters();
    });
    fsb.addEventListener("click", e => {
      const chip = e.target.closest("[data-chip-k]");
      if (chip) {
        const k = chip.dataset.chipK, v = chip.dataset.chipV, f = ui.filters;
        if (k === "assignedToMe") f.assignedToMe = false;
        else if (k === "dateFrom" || k === "dateTo" || k === "query") f[k] = "";
        else f[k] = f[k].filter(x => x !== v);
        applyFilters();
      }
      if (e.target.id === "fReset") { ui.filters = OP.emptyFilters(); applyFilters(); }
    });
  }
  function applyFilters() {
    writeUrl();
    renderSidebar(); renderQueueArea(); renderCounter();
  }

  /* ══════════ O2 관제 홈 (콘솔 셸) ══════════ */
  function renderConsole(root, params) {
    readUrl(params);
    root.innerHTML = globalBarHTML("queue") +
      `<div class="console">
        ${sidebarHTML()}
        <section class="queue-area" id="queueArea" aria-label="제보 큐"></section>
        <aside class="dpanel" id="dpanel" data-open="false" aria-label="사건 상세"></aside>
      </div>`;
    bindGlobalBar(() => { /* EmergencyCounter 클릭 → 응급 필터 즉시 적용 */
      ui.filters.triage = ["emergency"]; ui.view = "list"; applyFilters();
    });
    bindSidebar();
    $("#fsbToggle")?.addEventListener("click", () => $("#fsb").classList.toggle("open"));
    renderQueueArea();
    renderDetail();
    updateRefreshMeta();
  }
  function renderSidebar() {
    const old = $("#fsb");
    const open = old.classList.contains("open");
    old.outerHTML = sidebarHTML();
    if (open) $("#fsb").classList.add("open");
    bindSidebar();
  }
  function renderCounter() {
    const el = $("#emCounter");
    if (el) el.outerHTML = OP.emergencyCounterHTML();
    $("#emCounter")?.addEventListener("click", () => {
      ui.filters.triage = ["emergency"]; ui.view = "list"; applyFilters();
    });
  }
  function updateRefreshMeta() {
    const el = $("#refreshMeta");
    if (el) el.innerHTML = refreshMetaText();
  }

  /* ══════════ O2 큐 목록 / O2-Map 지도 ══════════ */
  function renderQueueArea(newIds = []) {
    const area = $("#queueArea");
    if (!area) return;
    const rows = OP.queueList(ui.filters);
    const total = OP.reports.filter(r => !r.mergedIntoReportId).length;
    const qbar = `<div class="qbar">
      <h1>제보 큐</h1>
      <div class="seg" role="group" aria-label="보기 전환">
        <button data-view="list" aria-pressed="${ui.view === "list"}">목록</button>
        <button data-view="map" aria-pressed="${ui.view === "map"}">지도</button>
      </div>
      <div class="search"><span class="si" aria-hidden="true">🔎</span>
        <input class="inp" id="qSearch" type="search" value="${esc(ui.filters.query)}"
          placeholder="사건번호·위치·특징 검색" aria-label="검색 — 사건번호, 위치, AI 특징 요약"><kbd>/</kbd></div>
      <span class="mobile-ro-note">모바일에서는 통계·매칭이 조회 전용으로 제한됩니다.</span>
    </div>`;
    if (ui.view === "map") {
      area.innerHTML = qbar + mapHTML(rows);
      bindQbar(); bindMap(rows);
      return;
    }
    let listHTML;
    if (!rows.length) {
      const anyFilter = filterChips().length > 0;
      listHTML = `<div class="empty-state" style="margin-top:40px">
        <b>${anyFilter ? "조건에 맞는 제보가 없습니다." : "현재 접수된 제보가 없습니다."}</b>
        ${anyFilter ? `<button class="btn sm" id="emptyReset" style="margin-top:8px">필터 초기화</button>` : "새 제보가 접수되면 여기에 표시됩니다."}
      </div>`;
    } else {
      listHTML = rows.map(r => OP.queueRowHTML(r, r.reportId === ui.selectedId)).join("");
    }
    area.innerHTML = qbar +
      `<div class="qlist" id="qlist" role="listbox" tabindex="0" aria-label="제보 큐 목록 — 방향키로 이동, Enter로 상세 열기"
        ${ui.focusId ? `aria-activedescendant="qr-${esc(ui.focusId)}"` : ""}>${listHTML}</div>`;
    bindQbar();
    const list = $("#qlist");
    list.addEventListener("click", e => {
      const row = e.target.closest(".qrow");
      if (row) openDetail(row.dataset.id);
    });
    $("#emptyReset")?.addEventListener("click", () => { ui.filters = OP.emptyFilters(); applyFilters(); });
    newIds.forEach(id => $(`#qr-${CSS.escape(id)}`)?.classList.add("is-new"));
    syncKfocus();
  }
  function bindQbar() {
    $$(".qbar [data-view]").forEach(b => b.addEventListener("click", () => {
      ui.view = b.dataset.view; writeUrl(); renderQueueArea();
    }));
    const inp = $("#qSearch");
    let debounce;
    inp.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        ui.filters.query = inp.value;
        writeUrl(); renderSidebar();
        /* 검색 입력 포커스를 유지한 채 목록만 갱신 */
        const keep = inp.value;
        renderQueueArea();
        const ninp = $("#qSearch");
        ninp.value = keep; ninp.focus(); ninp.setSelectionRange(keep.length, keep.length);
      }, 180);
    });
  }

  /* ── 키보드 행 포커스 (roving) ── */
  function visibleRowIds() { return $$("#qlist .qrow").map(el => el.dataset.id); }
  function syncKfocus() {
    $$("#qlist .qrow").forEach(el => el.classList.toggle("kfocus", el.dataset.id === ui.focusId));
  }
  function moveFocus(delta) {
    const ids = visibleRowIds();
    if (!ids.length) return;
    let i = ids.indexOf(ui.focusId);
    i = i === -1 ? (delta > 0 ? 0 : ids.length - 1) : Math.min(ids.length - 1, Math.max(0, i + delta));
    ui.focusId = ids[i];
    const list = $("#qlist");
    list.setAttribute("aria-activedescendant", `qr-${ui.focusId}`);
    syncKfocus();
    $(`#qr-${CSS.escape(ui.focusId)}`)?.scrollIntoView({ block: "nearest" });
  }

  /* ── O2-Map (mock map adapter — SDK 미연동 시 폴백 패널) ── */
  function mapHTML(rows) {
    const m = ui.map;
    const vb = `${m.cx - 360 / m.z} ${m.cy - 190 / m.z} ${720 / m.z} ${380 / m.z}`;
    /* 근접 마커 클러스터링 (화면 거리 기준) */
    const thr = 46 / m.z;
    const groups = [];
    rows.forEach(r => {
      const g = groups.find(g => Math.hypot(g.x - r.location.mapX, g.y - r.location.mapY) < thr);
      if (g) { g.items.push(r); g.x = (g.x * (g.items.length - 1) + r.location.mapX) / g.items.length; g.y = (g.y * (g.items.length - 1) + r.location.mapY) / g.items.length; }
      else groups.push({ x: r.location.mapX, y: r.location.mapY, items: [r] });
    });
    const k = 1 / m.z;
    const marks = groups.map(g => {
      if (g.items.length > 1)
        return `<g class="cluster" data-cx="${g.x}" data-cy="${g.y}" role="button" tabindex="0"
            aria-label="사건 ${g.items.length}건 묶음 — 선택하면 확대합니다" style="cursor:pointer">
          <circle cx="${g.x}" cy="${g.y}" r="${14 * k}"/>
          <text x="${g.x}" y="${g.y + 3.5 * k}" style="font-size:${10 * k}px">${g.items.length}</text></g>`;
      const r = g.items[0], t = r.triage.currentType;
      const x = r.location.mapX, y = r.location.mapY;
      const sel = r.reportId === ui.selectedId ? " sel" : "";
      const closedGlyph = (r.status === "closed" || r.status === "negative_closed")
        ? `<path class="done-chk" d="M${x - 3.2 * k} ${y} l${2.2 * k} ${2.6 * k} l${4.2 * k} ${-5 * k}"/>` : "";
      /* 색+형태 이중 부호화: 응급=원+사이렌, 출동=사각+차량, 부정=작은 점 */
      let shape;
      if (t === "emergency")
        shape = `<circle class="shape" cx="${x}" cy="${y}" r="${9 * k}"/><text x="${x}" y="${y + 3 * k}" style="font-size:${9 * k}px">!</text>`;
      else if (t === "dispatch")
        shape = `<rect class="shape" x="${x - 7 * k}" y="${y - 7 * k}" width="${14 * k}" height="${14 * k}" rx="${2 * k}"/><text x="${x}" y="${y + 3 * k}" style="font-size:${8 * k}px">▶</text>`;
      else if (t === "negative")
        shape = `<circle class="shape" cx="${x}" cy="${y}" r="${4.5 * k}"/>`;
      else
        shape = `<circle class="shape" cx="${x}" cy="${y}" r="${6 * k}"/>`;
      return `<g class="mk${sel}" data-id="${esc(r.reportId)}" data-px="${x}" data-py="${y}" role="button" tabindex="0"
        aria-label="${esc(`${r.reportId} — ${DL.TRIAGE[t].label}, ${DL.STATUS_META[r.status].label}, ${r.location.address}`)}">
        ${shape}${closedGlyph}</g>`;
    }).join("");
    return `<div class="map-area">
      <p class="map-note">⚠ 지도 SDK(Kakao/Naver) 미연동 — 시연용 mock 지도 패널입니다.
        운영자 화면이므로 <b>정확 좌표</b>가 표시됩니다. 시민 화면에는 위치 범위만 전달됩니다.
        동일 데이터는 아래 좌표 목록으로도 확인할 수 있습니다.</p>
      <div class="map-shell" id="mapShell">
        <svg viewBox="${vb}" role="img" aria-label="제주도 제보 현황 지도 (mock)">
          <path d="M96 208 C118 158,176 122,252 106 C330 90,430 88,510 104 C580 118,632 148,650 190
                   C664 224,646 258,600 278 C540 304,452 316,364 316 C272 316,182 300,126 272 C92 254,84 230,96 208 Z"
                fill="var(--color-surface-subtle)" stroke="var(--color-border-default)" stroke-width="1.5"/>
          <ellipse cx="372" cy="196" rx="52" ry="30" fill="var(--color-surface-muted)"/>
          ${marks}
        </svg>
        <div class="map-ctl">
          <button data-mz="in" aria-label="지도 확대">＋</button>
          <button data-mz="out" aria-label="지도 축소">−</button>
          <button data-mz="reset" aria-label="전체 보기">⤢</button>
        </div>
        <div class="map-legend" aria-hidden="true">
          <span><i style="background:var(--triage-emergency-solid)"></i>응급 (원)</span>
          <span><i class="sq" style="background:var(--triage-dispatch-solid,#E8940A)"></i>출동 (사각)</span>
          <span><i class="dot" style="background:var(--color-text-tertiary)"></i>부정 (점)</span>
          <span><i class="chk"></i>종결 (체크)</span>
        </div>
      </div>
      <details><summary style="font-size:13px;cursor:pointer">좌표 목록으로 보기 (지도 대체 접근)</summary>
        <table class="data" style="margin-top:8px"><caption class="sr-only">지도에 표시된 사건의 좌표 목록</caption>
        <thead><tr><th>사건번호</th><th>트리아지</th><th>상태</th><th>정확 좌표</th><th>주소</th></tr></thead>
        <tbody>${rows.map(r => `<tr>
          <td class="mono"><a href="#/queue?view=list&reportId=${esc(r.reportId)}">${esc(r.reportId)}</a></td>
          <td>${DL.triageBadge(r.triage.currentType, "sm")}</td><td>${DL.statusBadge(r.status)}</td>
          <td class="mono">${r.location.latitude}, ${r.location.longitude}</td>
          <td>${esc(OP.shortAddr(r.location.address))}</td></tr>`).join("")}</tbody></table>
      </details>
    </div>`;
  }
  function bindMap(rows) {
    const shell = $("#mapShell");
    shell.addEventListener("click", e => {
      const zb = e.target.closest("[data-mz]");
      if (zb) {
        const m = ui.map;
        if (zb.dataset.mz === "in") m.z = Math.min(8, m.z * 2);
        if (zb.dataset.mz === "out") m.z = Math.max(1, m.z / 2);
        if (zb.dataset.mz === "reset") { m.z = 1; m.cx = 360; m.cy = 190; }
        renderQueueArea(); return;
      }
      const cl = e.target.closest(".cluster");
      if (cl) { ui.map = { z: Math.min(8, ui.map.z * 2), cx: +cl.dataset.cx, cy: +cl.dataset.cy }; renderQueueArea(); return; }
      const mk = e.target.closest(".mk");
      if (mk) showMapCard(mk, rows);
    });
    shell.addEventListener("keydown", e => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const mk = e.target.closest(".mk"); const cl = e.target.closest(".cluster");
      if (mk) { e.preventDefault(); showMapCard(mk, rows); }
      if (cl) { e.preventDefault(); ui.map = { z: Math.min(8, ui.map.z * 2), cx: +cl.dataset.cx, cy: +cl.dataset.cy }; renderQueueArea(); }
    });
  }
  function showMapCard(mk, rows) {
    $(".map-card")?.remove();
    const r = rows.find(r => r.reportId === mk.dataset.id);
    if (!r) return;
    const shell = $("#mapShell");
    const m = ui.map;
    const relX = ((+mk.dataset.px) - (m.cx - 360 / m.z)) / (720 / m.z);
    const relY = ((+mk.dataset.py) - (m.cy - 190 / m.z)) / (380 / m.z);
    const card = document.createElement("div");
    card.className = "map-card";
    card.style.left = `min(max(${(relX * 100).toFixed(1)}%, 8px), calc(100% - 248px))`;
    card.style.top = `min(${(relY * 100).toFixed(1)}%, calc(100% - 150px))`;
    card.innerHTML = `<div class="mc-head">${DL.triageBadge(r.triage.currentType, "sm")}
        <span class="mc-id">${esc(r.reportId)}</span>
        <button class="icon-btn" data-x aria-label="카드 닫기" style="margin-left:auto">✕</button></div>
      <div class="mc-body"><span class="mc-thumb" aria-hidden="true">${DL.photoHTML(r.photos[0])}</span>
        <div>${esc(r.aiSummary)}<br><span class="mono" style="color:var(--color-text-secondary)">${r.location.latitude}, ${r.location.longitude}</span></div></div>
      <button class="btn primary" data-open>상세 열기</button>`;
    card.querySelector("[data-x]").addEventListener("click", () => card.remove());
    card.querySelector("[data-open]").addEventListener("click", () => { card.remove(); openDetail(r.reportId); });
    shell.appendChild(card);
  }

  /* ══════════ O3 건 상세 패널 ══════════ */
  function openDetail(id, fromRowFocus = true) {
    ui.selectedId = id;
    if (fromRowFocus) ui.focusId = id;
    writeUrl();
    renderQueueArea();
    renderDetail();
  }
  function closeDetail() {
    const prev = ui.selectedId;
    ui.selectedId = null;
    writeUrl();
    renderQueueArea();
    renderDetail();
    /* 큐 포커스 복원 */
    if (prev) {
      ui.focusId = prev;
      const list = $("#qlist");
      if (list) { list.focus(); syncKfocus(); }
    }
  }

  const AUDIT_LABEL = {
    report_created: "접수", assigned: "담당자 배정", status_changed: "상태 변경",
    triage_overridden: "AI 판정 번복", report_linked: "같은 개체 연결", report_merged: "중복 병합",
    match_rejected: "매칭 무관 판정", closed: "종결 처리", guardian_notified: "보호자 알림 확인", exported: "내보내기",
  };
  function auditItemHTML(a) {
    const sys = a.actor && a.actor.type === "system";
    const stLabel = v => DL.STATUS_META[v] ? DL.STATUS_META[v].label : (DL.TRIAGE[v] ? DL.TRIAGE[v].label : v);
    const diff = (a.before != null || a.after != null)
      ? `<div class="a-diff">${a.before != null ? `${esc(stLabel(a.before))} → ` : ""}${esc(stLabel(a.after ?? ""))}</div>` : "";
    return `<li><div class="a-line1"><span class="a-act">${esc(AUDIT_LABEL[a.action] || a.action)}</span>
      <span class="a-actor ${sys ? "system" : ""}">${esc(a.actor.displayName)}${sys ? " (자동)" : ""}</span>
      <time class="mono" datetime="${a.occurredAt.toISOString()}">${esc(DL.ymdhms(a.occurredAt))}</time></div>
      ${diff}${a.reason ? `<div class="a-reason">사유: ${esc(a.reason)}</div>` : ""}</li>`;
  }

  function renderDetail() {
    const panel = $("#dpanel");
    if (!panel) return;
    const r = ui.selectedId ? OP.getReport(ui.selectedId) : null;
    panel.dataset.open = String(!!r);
    if (!r) {
      panel.innerHTML = `<div class="d-empty"><div class="empty-state"><b>선택된 사건이 없습니다</b>큐에서 사건을 선택하면 상세가 여기에 표시됩니다.</div></div>`;
      return;
    }
    const me = OP.auth.currentUser();
    const tri = r.triage;
    const conf = tri.confidence != null ? `참고 신뢰도 ${(tri.confidence * 100).toFixed(0)}%` : "신뢰도 정보 없음";
    const emWait = tri.currentType === "emergency" && r.status === "submitted"
      ? Math.floor((Date.now() - r.submittedAt) / 60000) : null;

    /* 매칭 후보 (O4-M) */
    const cands = OP.candidatesFor(r.reportId);
    const decisions = r.matchDecisions || {};
    const decidedList = Object.entries(decisions);

    const auditSorted = r.auditLog.slice().sort((a, b) =>
      ui.auditSort === "desc" ? b.occurredAt - a.occurredAt : a.occurredAt - b.occurredAt);

    const actions = OP.actionsFor(r.status);
    const terminal = OP.isTerminal(r.status);

    panel.innerHTML = `
    <div class="d-scroll">
      <div class="d-head">
        <div class="row1">
          <span class="rid">${esc(r.reportId)}</span>
          <button class="icon-btn" id="copyId" aria-label="사건번호 복사" title="사건번호 복사">⧉</button>
          <button class="icon-btn close" id="dClose" aria-label="상세 닫기">✕</button>
        </div>
        <div class="badges">${DL.triageBadge(tri.currentType)}${DL.statusBadge(r.status)}
          ${r.isEmergencyAutoSubmitted ? `<span class="badge" data-variant="danger">시민 확인 후 자동 접수</span>` : ""}
          ${r.mergedIntoReportId ? `<span class="badge" data-variant="neutral">병합됨 → ${esc(r.mergedIntoReportId)}</span>` : ""}
        </div>
        ${emWait != null && emWait >= 15 ? `<p class="notice danger" role="alert">⏱ 응급 미처리 ${esc(DL.durText(emWait * 60000))} 경과 — 즉시 확인이 필요합니다.</p>` : ""}
        <div class="meta">
          <span>담당자: <b>${esc(r.assignee ? r.assignee.displayName : "미배정")}</b>
            ${!r.assignee || (me && r.assignee.id !== me.id) ? `<button class="btn sm" id="assignMe" style="margin-left:6px">나에게 배정<kbd class="sc">A</kbd></button>` : ""}</span>
          <span>접수 <b class="mono">${esc(DL.ymdhms(r.submittedAt))}</b> · 갱신 <b class="mono">${esc(DL.ymdhm(r.updatedAt))}</b></span>
        </div>
      </div>

      <div class="d-sec"><h3>사진 (${r.photos.length}장)</h3>${OP.photoViewerHTML(r)}</div>

      <div class="d-sec"><h3>AI 판정 (AITriageCard)</h3>
        <div class="ai-card">
          <div class="top">${DL.triageBadge(tri.currentType, "lg")}
            <span class="cap">${esc(conf)} · 분석 ${esc(tri.analyzedAt ? DL.hhmmss(tri.analyzedAt) : "—")}</span></div>
          <p class="basis">${esc(tri.summary)}</p>
          <p class="cap">AI 판단이며 담당자가 최종 확인합니다. 번복 기록은 AI 개선 데이터로 활용될 수 있습니다.</p>
          ${tri.overriddenAt ? `<div class="prev">이전 판정: ${DL.triageBadge(tri.originalType, "sm")}
            <del>${esc(DL.TRIAGE[tri.originalType].label)} 판정</del> →
            현재 ${esc(DL.TRIAGE[tri.currentType].label)} ·
            ${esc(OP.OVERRIDE_REASONS[tri.overrideReason] || "")}${tri.overrideNote ? ` — ${esc(tri.overrideNote)}` : ""}
            · ${esc(tri.overriddenBy ? tri.overriddenBy.displayName : "")} ${esc(DL.ymdhm(tri.overriddenAt))}</div>` : ""}
          <div style="margin-top:10px"><button class="btn sm" id="btnOverride" ${terminal ? "disabled" : ""}>판정 번복</button></div>
        </div>
      </div>

      <div class="d-sec"><h3>제보 정보</h3>
        <dl class="kv">
          <dt>정확 좌표</dt><dd class="mono">${r.location.latitude}, ${r.location.longitude}
            <button class="btn sm" id="openMap" style="margin-left:4px">지도</button></dd>
          <dt>주소</dt><dd>${esc(r.location.address)}</dd>
          <dt>목격 시각</dt><dd class="mono">${r.reporterContext.observedAt ? esc(DL.ymdhm(r.reporterContext.observedAt)) : '<span class="na">입력되지 않음</span>'}</dd>
          <dt>접수 시각</dt><dd class="mono">${esc(DL.ymdhms(r.submittedAt))}</dd>
          <dt>시민 서술</dt><dd>${r.reporterContext.description ? esc(r.reporterContext.description) : '<span class="na">입력되지 않음</span>'}</dd>
          <dt>상황</dt><dd>${r.reporterContext.situationTags.length
            ? `<span class="chips">${r.reporterContext.situationTags.map(t => `<span>${esc(t)}</span>`).join("")}</span>`
            : '<span class="na">선택된 상황 없음</span>'}</dd>
          <dt>응급 자동신고</dt><dd>${r.isEmergencyAutoSubmitted ? "예 — 시민 확인 후 자동 접수" : "아니요"}</dd>
        </dl>
        <div style="margin-top:10px"><button class="btn sm" id="citizenPreview">시민 상태 화면(S7) 미리보기</button></div>
      </div>

      <div class="d-sec"><h3>처리 타임라인 (ProcessTimeline)</h3>
        ${DL.processTimeline(OP.timelineSteps(r))}
        <p class="cap" style="font-size:11.5px;color:var(--color-text-tertiary);margin:8px 0 0">
          상태 변경자 정보는 아래 감사 로그에서 확인합니다.</p>
      </div>

      ${r.closure ? `<div class="d-sec"><h3>종결 요약</h3>${closureSummaryHTML(r)}</div>` : ""}

      <div class="d-sec"><h3>중복·실종 매칭 후보 (O4-M)</h3>
        <p class="cap" style="font-size:12px;color:var(--color-text-secondary);margin:0 0 10px">
          AI가 후보를 제안하고 확정은 담당자가 합니다. 자동 병합·자동 연결은 없습니다.</p>
        ${cands.length ? cands.map(c => candCardHTML(r, c)).join("")
          : `<div class="empty-state" style="padding:14px"><b>제안할 후보가 없습니다</b>유사 점수 45점 이상의 후보만 표시됩니다.</div>`}
        ${decidedList.length ? `<div class="cand decided"><div class="decided-note">처리한 후보:
          ${decidedList.map(([cid, d]) => `${esc(cid)} — ${{ link: "같은 개체 연결", merge: "중복 병합", unrelated: "무관" }[d.decision]} (${esc(d.actor ? d.actor.displayName : "")}, ${esc(DL.hhmm(d.at))})`).join(" · ")}
        </div></div>` : ""}
        ${r.linkedReportIds.length ? `<p class="cap" style="font-size:12px">연결된 사건·신고: ${r.linkedReportIds.map(esc).join(", ")}</p>` : ""}
      </div>

      <div class="d-sec"><h3>감사 로그
        <select id="auditSort" aria-label="감사 로그 정렬" style="float:right;font-size:12px;border:1px solid var(--color-border-default);border-radius:6px;padding:2px 6px">
          <option value="desc" ${ui.auditSort === "desc" ? "selected" : ""}>최신순</option>
          <option value="asc" ${ui.auditSort === "asc" ? "selected" : ""}>오래된순</option>
        </select></h3>
        <ul class="audit-list">${auditSorted.map(auditItemHTML).join("")}</ul>
      </div>
    </div>

    <div class="abar" role="group" aria-label="상태 변경">
      ${terminal
        ? `<p class="term-note">이 사건은 <b>${esc(DL.STATUS_META[r.status].label)}</b> 상태입니다. 추가 상태 변경은 없으며 기록은 보존됩니다.</p>`
        : actions.map((a, i) => `<button class="btn ${a.destructive ? "destructive" : i === 0 ? "primary" : ""}"
            data-target="${a.targetStatus}">${esc(a.label)}${a.shortcut ? `<kbd class="sc">${a.shortcut}</kbd>` : ""}</button>`).join("")}
    </div>`;

    /* ── 상세 이벤트 바인딩 ── */
    $("#dClose").addEventListener("click", closeDetail);
    $("#copyId").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(r.reportId); DL.toast("사건번호를 복사했습니다."); }
      catch { DL.toast("복사에 실패했습니다. 사건번호: " + r.reportId); }
    });
    $("#assignMe")?.addEventListener("click", () => {
      const res = OP.assignToMe(r.reportId);
      DL.toast(res.ok ? "나에게 배정했습니다." : res.message);
      if (res.ok) { renderDetail(); renderQueueArea(); }
    });
    $("#openMap").addEventListener("click", () => {
      ui.view = "map";
      ui.map = { z: 4, cx: r.location.mapX, cy: r.location.mapY };
      writeUrl(); renderQueueArea();
    });
    $("#citizenPreview").addEventListener("click", () => showCitizenPreview(r.reportId));
    $("#btnOverride")?.addEventListener("click", () => openOverrideDialog(r));
    $("#auditSort").addEventListener("change", e => { ui.auditSort = e.target.value; renderDetail(); });
    $$("#dpanel .abar [data-target]").forEach(b =>
      b.addEventListener("click", () => requestAction(r.reportId, b.dataset.target)));
    $$("#dpanel .cand [data-mdec]").forEach(b =>
      b.addEventListener("click", () => handleMatchDecision(r.reportId, b.dataset.cid, b.dataset.ctype, b.dataset.mdec)));
    OP.initPhotoViewer(panel, r);
  }

  function closureSummaryHTML(r) {
    const at = st => { const e = r.timeline.find(e => e.status === st); return e ? e.occurredAt : null; };
    const first = at("reviewing");
    const end = r.closure.closedAt;
    const segs = [];
    for (let i = 1; i < r.timeline.length; i++)
      segs.push(`${esc(DL.STATUS_META[r.timeline[i - 1].status].label)} → ${esc(DL.STATUS_META[r.timeline[i].status].label)}: <b class="mono">${esc(DL.durText(r.timeline[i].occurredAt - r.timeline[i - 1].occurredAt))}</b>`);
    const actors = [...new Set(r.timeline.map(e => e.actor && e.actor.displayName).filter(Boolean))];
    return `<dl class="kv">
      <dt>최종 결과</dt><dd><b>${esc(OP.CLOSURE_RESULTS[r.closure.result] || r.closure.result)}</b></dd>
      <dt>총 소요</dt><dd class="mono">${esc(DL.durText(end - r.submittedAt))}</dd>
      <dt>초동 대응</dt><dd class="mono">${first ? esc(DL.durText(first - r.submittedAt)) : '<span class="na">확인 시작 기록 없음</span>'}</dd>
      <dt>단계별 경과</dt><dd>${segs.join("<br>") || '<span class="na">—</span>'}</dd>
      <dt>관여 담당자</dt><dd>${esc(actors.join(", "))}</dd>
      <dt>종결 메모</dt><dd>${r.closure.memo ? esc(r.closure.memo) : '<span class="na">메모 없음</span>'}</dd>
      <dt>종결 처리</dt><dd>${esc(r.closure.closedBy ? r.closure.closedBy.displayName : "")} · <span class="mono">${esc(DL.ymdhm(end))}</span></dd>
    </dl>`;
  }

  /* ── 시민 상태 화면(S7) 미리보기 — 데이터 계약 검증용 ── */
  function showCitizenPreview(id) {
    const v = OP.citizenView(id);
    if (!v) return;
    DL.openDialog({
      title: `시민 상태 확인 화면 미리보기 — ${v.접수번호}`,
      body: `<p class="notice info" style="margin:0 0 12px">시민에게 전달되는 데이터입니다.
          정확 좌표·상세 주소·담당자 정보는 <b>응답에서 제거</b>되어 전송되지 않습니다.</p>
        <dl class="kv" style="display:grid;grid-template-columns:96px 1fr;gap:6px 10px;font-size:13px">
          <dt>접수번호</dt><dd class="mono">${esc(v.접수번호)}</dd>
          <dt>처리 단계</dt><dd><b>${esc(v.처리단계)}</b></dd>
          <dt>단계 이력</dt><dd>${v.단계이력.map(s => `${s.도달 ? "●" : "○"} ${esc(s.단계)}`).join(" → ")}</dd>
          <dt>위치 범위</dt><dd>${esc(v.위치범위)}</dd>
          <dt>접수</dt><dd class="mono">${esc(v.접수시각)}</dd>
          <dt>최근 갱신</dt><dd class="mono">${esc(v.최근갱신)}</dd>
        </dl>`,
      actions: [{ label: "닫기", autofocus: true }],
    });
  }

  /* ══════════ O4-R AI 판정 번복 ══════════ */
  function openOverrideDialog(r) {
    const triOpts = ["emergency", "dispatch", "negative"]
      .filter(t => t !== r.triage.currentType)
      .map(t => `<label class="ck" style="display:flex;align-items:center;gap:8px;min-height:36px">
        <input type="radio" name="ntri" value="${t}"> ${DL.triageBadge(t, "sm")}</label>`).join("");
    const reasonOpts = Object.entries(OP.OVERRIDE_REASONS)
      .map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("");
    DL.openDialog({
      title: `AI 판정 번복 — ${r.reportId}`,
      body: `<p style="margin:0 0 10px">현재 판정: ${DL.triageBadge(r.triage.currentType, "sm")}
          <span style="font-size:12px;color:var(--color-text-secondary)">원 판정은 삭제되지 않고 이력으로 보존됩니다.</span></p>
        <div class="field" style="margin-bottom:12px"><label>새 판정 <em style="color:var(--status-danger-text)">*</em></label>${triOpts}</div>
        <div class="field" style="margin-bottom:12px"><label for="ovReason">번복 사유 <em style="color:var(--status-danger-text)">*</em></label>
          <select class="inp" id="ovReason"><option value="">사유 선택…</option>${reasonOpts}</select></div>
        <div class="field"><label for="ovNote">설명 (기타 선택 시 필수)</label>
          <textarea class="inp" id="ovNote" rows="2"></textarea></div>
        <p class="login-msg" id="ovMsg" role="alert"></p>
        <p style="font-size:12px;color:var(--color-text-secondary);margin:8px 0 0">
          번복 기록은 감사 로그에 남고 AI 개선 데이터로 활용될 수 있습니다.</p>`,
      actions: [
        { label: "취소" },
        {
          label: "번복 저장", className: "primary",
          onClick(api) {
            const nt = api.root.querySelector("input[name=ntri]:checked");
            const reason = api.root.querySelector("#ovReason").value;
            const note = api.root.querySelector("#ovNote").value;
            const msg = api.root.querySelector("#ovMsg");
            if (!nt) { msg.textContent = "새 판정을 선택해 주세요."; return false; }
            const res = OP.overrideTriage(r.reportId, nt.value, reason, note);
            if (!res.ok) { msg.textContent = res.message; return false; }
            DL.toast("판정을 번복하고 감사 로그에 기록했습니다.");
            renderDetail(); renderQueueArea(); renderCounter();
          },
        },
      ],
    });
  }

  /* ══════════ O4-M 매칭 카드 ══════════ */
  function candCardHTML(r, c) {
    const typeLabel = c.candidateType === "missing_report" ? "실종 신고" : "제보 사건";
    return `<div class="cand">
      <div class="chead">${DL.triageBadge ? "" : ""}<span class="cid">${esc(c.candidateId)}</span>
        <span class="cmeta">${esc(typeLabel)} · ${esc(DL.ymdhm(c.when))} · 거리 약 ${c.distanceKm}km · 시간차 ${esc(DL.durText(c.timeDiffMinutes * 60000))}</span></div>
      <div class="compare">
        <figure><div class="ph">${DL.photoHTML(r.photos[0])}</div><figcaption>현재 사건 ${esc(r.reportId)}</figcaption></figure>
        <figure><div class="ph">${DL.photoHTML(c.photo)}</div><figcaption>${esc(typeLabel)} ${esc(c.candidateId)}${c.ref.name ? ` (${esc(c.ref.name)})` : ""}</figcaption></figure>
      </div>
      <div class="score"><span class="cap">참고 유사 점수</span>
        <span class="bar" aria-hidden="true"><i style="width:${c.score}%"></i></span><b>${c.score}점</b></div>
      <div class="ev">${c.evidence.map(e => `<span class="${e.hit ? "hit" : ""}">${esc(e.text)}</span>`).join("")}</div>
      <div class="acts">
        <button class="btn" data-mdec="link" data-cid="${esc(c.candidateId)}" data-ctype="${c.candidateType}">같은 개체 — 연결</button>
        ${c.candidateType === "report" ? `<button class="btn" data-mdec="merge" data-cid="${esc(c.candidateId)}" data-ctype="report">중복 — 병합</button>` : ""}
        <button class="btn" data-mdec="unrelated" data-cid="${esc(c.candidateId)}" data-ctype="${c.candidateType}">무관</button>
      </div>
    </div>`;
  }
  function handleMatchDecision(reportId, candidateId, candidateType, decision) {
    const r = OP.getReport(reportId);
    if (decision === "merge") {
      const dup = OP.getReport(candidateId);
      DL.openDialog({
        title: "중복 병합 미리보기",
        body: `<dl class="kv" style="display:grid;grid-template-columns:110px 1fr;gap:6px 10px;font-size:13px">
            <dt>대표 사건</dt><dd><b class="mono">${esc(reportId)}</b> — 이 사건이 유지됩니다.</dd>
            <dt>병합될 사건</dt><dd class="mono">${esc(candidateId)}</dd>
            <dt>유지되는 정보</dt><dd>대표 사건의 사진·위치·이력. 병합 사건의 사진과 기록은 원 사건에 보존됩니다.</dd>
            <dt>시민 상태 링크</dt><dd>병합된 사건의 시민 상태 확인 링크는 대표 사건 상태로 안내됩니다.</dd>
            <dt>원 기록</dt><dd>병합 후에도 ${esc(candidateId)}는 삭제되지 않고 감사 추적을 위해 보존됩니다.</dd>
            <dt>되돌림</dt><dd>이 mock에는 병합 취소 기능이 없습니다 — 확정 전 취소만 가능합니다.</dd>
          </dl>`,
        actions: [
          { label: "취소", autofocus: true },
          {
            label: "병합 확정", className: "primary",
            onClick() {
              const res = OP.decideMatch(reportId, candidateId, "merge");
              DL.toast(res.ok ? `${candidateId}를 ${reportId}(으)로 병합했습니다 (원 기록 보존).` : res.message);
              renderDetail(); renderQueueArea(); renderCounter();
            },
          },
        ],
      });
      return;
    }
    if (decision === "link") {
      const res = OP.decideMatch(reportId, candidateId, "link");
      if (res.ok) {
        DL.toast("같은 개체로 연결하고 감사 로그에 기록했습니다.");
        /* 실종 신고 연결 → 보호자 알림 발송 전 별도 확인 단계 */
        if (candidateType === "missing_report") {
          const mi = OP.getMissing(candidateId);
          DL.openDialog({
            title: "보호자 알림 발송 확인",
            body: `<p style="margin:0 0 10px">실종 신고 <b class="mono">${esc(candidateId)}</b>${mi ? ` (${esc(mi.name)})` : ""}와 연결되었습니다.</p>
              <p style="margin:0 0 10px">보호자 ${mi ? esc(mi.guardian) : ""}에게 발견 사실을 알리시겠습니까?</p>
              <p class="notice warn" style="margin:0">실제 문자·푸시 발송 채널은 미연동 상태입니다 — 확인 시 발송 <b>기록만</b> 남습니다 (mock).</p>`,
            actions: [
              { label: "나중에" },
              {
                label: "알림 발송 확인", className: "primary",
                onClick() { OP.notifyGuardian(reportId, candidateId); DL.toast("보호자 알림 확인을 기록했습니다 (mock)."); renderDetail(); },
              },
            ],
          });
        }
      } else DL.toast(res.message);
      renderDetail(); renderQueueArea();
      return;
    }
    const res = OP.decideMatch(reportId, candidateId, "unrelated");
    DL.toast(res.ok ? "무관으로 기록했습니다." : res.message);
    renderDetail();
  }

  /* ══════════ O5 상태 변경 / O6 종결 ══════════ */
  function requestAction(reportId, target) {
    if (ui.busy) return;
    const r = OP.getReport(reportId);
    if (!r) return;
    if (!OP.canTransition(r.status, target)) {
      DL.toast(`현재 상태(${DL.STATUS_META[r.status].label})에서는 실행할 수 없는 동작입니다.`);
      return;
    }
    if (target === "negative_closed") return openNegativeCloseDialog(r);
    if (target === "closed") return openCloseDialog(r);
    performTransition(reportId, target);
  }
  function performTransition(reportId, target, opts) {
    ui.busy = true;
    $$("#dpanel .abar .btn").forEach(b => { b.disabled = true; b.setAttribute("aria-busy", "true"); });
    const res = OP.requestTransition(reportId, target, opts);
    ui.busy = false;
    if (!res.ok) {
      DL.toast(res.message);
      renderDetail();
      return;
    }
    /* 성공 — 큐 행·상세·시민 상태 데이터 동기화 + 반영 고지 */
    let msg = `상태를 '${DL.STATUS_META[target].label}'(으)로 변경했습니다 · 시민 화면에 반영됨`;
    if (res.autoAssigned) msg += ` · 담당자 미배정 건이라 ${OP.auth.currentUser().displayName}님께 자동 배정되었습니다`;
    DL.toast(msg, 3600);
    renderDetail(); renderQueueArea(); renderCounter();
  }
  function openNegativeCloseDialog(r) {
    DL.openDialog({
      title: `부정 종결 확인 — ${r.reportId}`,
      body: `<dl class="kv" style="display:grid;grid-template-columns:130px 1fr;gap:6px 10px;font-size:13px">
          <dt>사건번호</dt><dd class="mono">${esc(r.reportId)}</dd>
          <dt>현재 트리아지</dt><dd>${DL.triageBadge(r.triage.currentType, "sm")}</dd>
          <dt>시민 화면 표시</dt><dd>"종결 (대응 불필요)"로 표시됩니다.</dd>
          <dt>되돌림 정책</dt><dd>부정 종결은 기록이 남는 종결 상태이며, 이 mock에는 되돌림 기능이 없습니다.</dd>
        </dl>
        <div class="field" style="margin-top:12px"><label for="ncMemo">부정 종결 사유 <em style="color:var(--status-danger-text)">*</em></label>
          <textarea class="inp" id="ncMemo" rows="2" placeholder="예: 보호자 동반 확인 — 오인 제보"></textarea></div>
        <p class="login-msg" id="ncMsg" role="alert"></p>`,
      actions: [
        { label: "취소", autofocus: true },
        {
          label: "부정 종결", className: "destructive",
          onClick(api) {
            const memo = api.root.querySelector("#ncMemo").value.trim();
            if (!memo) { api.root.querySelector("#ncMsg").textContent = "부정 종결 사유를 입력해 주세요."; return false; }
            performTransition(r.reportId, "negative_closed", { result: "negative", memo });
          },
        },
      ],
    });
  }
  function openCloseDialog(r) {
    const opts = Object.entries(OP.CLOSURE_RESULTS)
      .map(([k, v], i) => `<label class="ck" style="display:flex;align-items:center;gap:8px;min-height:36px">
        <input type="radio" name="cres" value="${k}" ${i === 0 ? "" : ""}> ${esc(v)}</label>`).join("");
    DL.openDialog({
      title: `종결 처리 — ${r.reportId}`,
      body: `<div class="field" style="margin-bottom:12px"><label>종결 결과 분류 <em style="color:var(--status-danger-text)">*</em></label>${opts}</div>
        <div class="field"><label for="clMemo">종결 메모 (선택)</label>
          <textarea class="inp" id="clMemo" rows="2"></textarea></div>
        <p class="login-msg" id="clMsg" role="alert"></p>
        <p style="font-size:12px;color:var(--color-text-secondary);margin:8px 0 0">
          종결 사건은 삭제되지 않으며 기본 큐에서 숨겨지고 필터로 다시 조회할 수 있습니다.</p>`,
      actions: [
        { label: "취소" },
        {
          label: "종결 확정", className: "primary",
          onClick(api) {
            const sel = api.root.querySelector("input[name=cres]:checked");
            if (!sel) { api.root.querySelector("#clMsg").textContent = "종결 결과 분류를 선택해 주세요."; return false; }
            performTransition(r.reportId, "closed", { result: sel.value, memo: api.root.querySelector("#clMemo").value.trim() });
          },
        },
      ],
    });
  }

  /* ══════════ O7 통계·보고 ══════════ */
  const statsUi = { preset: "7d", from: "", to: "" };
  function statsRange() {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    let start;
    if (statsUi.preset === "today") start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (statsUi.preset === "7d") start = new Date(end.getTime() - 6 * 86400000);
    else if (statsUi.preset === "30d") start = new Date(end.getTime() - 29 * 86400000);
    else if (statsUi.preset === "month") start = new Date(now.getFullYear(), now.getMonth(), 1);
    else {
      start = statsUi.from ? new Date(statsUi.from + "T00:00:00") : new Date(end.getTime() - 6 * 86400000);
      return { from: start, to: statsUi.to ? new Date(statsUi.to + "T23:59:59") : end };
    }
    return { from: start, to: end };
  }
  function renderStats(root) {
    const { from, to } = statsRange();
    const st = OP.statistics(from, to);
    const fmtMin = ms => ms == null ? null : DL.durText(ms);
    const cards = [
      { label: "총 제보 수", value: st.total, unit: "건", definition: "기간 내 접수된 제보 수 (병합된 중복 제외)" },
      { label: "응급 건수", value: st.emergency, unit: "건", definition: "기간 내 현재 트리아지가 '응급'인 제보 수" },
      { label: "평균 초동 대응 시간", value: fmtMin(st.avgFirstResponseMs), definition: `초동 대응 시간 = 접수 시각부터 확인 시작 시각까지 (대상 ${st.firstResponseN}건)`, naText: "확인 시작 기록 없음" },
      { label: "평균 종결 시간", value: fmtMin(st.avgCloseMs), definition: `종결 시간 = 접수 시각부터 종결 시각까지 (대상 ${st.closeN}건)`, naText: "종결 사건 없음" },
      { label: "중복 병합 건수", value: st.merged, unit: "건", definition: "기간 내 대표 사건으로 병합 처리된 중복 제보 수" },
      { label: "AI 판정 번복률", value: st.overrideRate == null ? null : (st.overrideRate * 100).toFixed(1), unit: "%", definition: `운영자가 AI 최초 판정을 변경한 사건 수(${st.overrideN}) ÷ AI 판정 완료 사건 수(${st.analyzedN})`, naText: "판정 완료 사건 없음" },
    ];
    const presets = [["today", "오늘"], ["7d", "최근 7일"], ["30d", "최근 30일"], ["month", "이번 달"], ["custom", "사용자 지정"]];
    root.innerHTML = globalBarHTML("stats") + `<div class="stats-wrap">
      <h1>통계·보고</h1>
      <p class="stats-sub">기간: <b class="mono">${esc(DL.ymd(from))} ~ ${esc(DL.ymd(to))}</b> ·
        수치는 이 콘솔의 mock 데이터 기준이며 모든 지표에 기준 정의가 병기됩니다.</p>
      <div class="period-bar">
        <div class="seg" role="group" aria-label="기간 선택">${presets.map(([k, v]) =>
          `<button data-preset="${k}" aria-pressed="${statsUi.preset === k}">${v}</button>`).join("")}</div>
        ${statsUi.preset === "custom" ? `
          <input type="date" id="stFrom" value="${esc(statsUi.from)}" aria-label="시작일">
          <span>~</span><input type="date" id="stTo" value="${esc(statsUi.to)}" aria-label="종료일">` : ""}
      </div>
      <div class="stat-grid">${cards.map(OP.statCardHTML).join("")}</div>
      <div class="chart-card">
        <h2>일자별 제보량 추이</h2>
        <p class="cap">막대 = 총 제보(파랑) · ▲ 실선 = 응급 건수(트리아지 응급색). 동일 데이터가 아래 표에 제공됩니다.</p>
        <div class="chart-legend">
          <span><i style="background:var(--color-primary-500)"></i>총 제보 (막대)</span>
          <span><i style="background:var(--triage-emergency-solid)"></i>응급 (▲ 마커 실선)</span>
        </div>
        ${OP.trendChartSVG(st.trend)}
        ${st.trend.length ? `<table class="data" style="margin-top:12px">
          <caption>일자별 제보량 데이터 표</caption>
          <thead><tr><th>일자</th><th class="num">총 제보</th><th class="num">응급</th><th class="num">출동</th><th class="num">부정</th></tr></thead>
          <tbody>${st.trend.map(d => `<tr><td class="mono">${esc(d.date)}</td><td class="num">${d.total}</td>
            <td class="num">${d.emergency}</td><td class="num">${d.dispatch}</td><td class="num">${d.negative}</td></tr>`).join("")}</tbody>
        </table>` : ""}
      </div>
      <div class="chart-card">
        <h2>지역별 분포</h2>
        <p class="cap">집계 화면에는 상세 좌표를 노출하지 않습니다 — 지역 단위 건수만 표시합니다.</p>
        ${st.regions.length ? `<table class="data"><caption class="sr-only">지역별 제보 건수</caption>
          <thead><tr><th>지역</th><th class="num">건수</th><th class="num">비중</th></tr></thead>
          <tbody>${st.regions.map(g => `<tr><td>${esc(g.region)}</td><td class="num">${g.count}</td>
            <td class="num">${st.total ? (g.count / st.total * 100).toFixed(0) : 0}%</td></tr>`).join("")}</tbody></table>`
          : `<div class="empty-state"><b>데이터 없음</b></div>`}
      </div>
      <div class="chart-card">
        <h2>내보내기</h2>
        <div class="export-row">
          <button class="btn" id="expCsv">CSV 내려받기 (클라이언트 생성)</button>
          <button class="btn" id="expPdf">인쇄용 보기 — 브라우저에서 PDF 저장</button>
          <span class="cap">서버 PDF 생성 API는 미연동입니다. 내보내기 파일에는 기간·기준 정의가 포함되고,
            개인정보와 정확 좌표는 포함되지 않습니다.</span>
        </div>
      </div>
    </div>`;
    bindGlobalBar(() => { location.hash = "#/queue?view=list&triage=emergency"; });
    updateRefreshMeta();
    $$("[data-preset]").forEach(b => b.addEventListener("click", () => { statsUi.preset = b.dataset.preset; renderStats(root); }));
    $("#stFrom")?.addEventListener("change", e => { statsUi.from = e.target.value; renderStats(root); });
    $("#stTo")?.addEventListener("change", e => { statsUi.to = e.target.value; renderStats(root); });
    $("#expCsv").addEventListener("click", () => {
      const meta = [
        `DOG-LINK 운영 통계 (${DL.ymd(from)} ~ ${DL.ymd(to)})`,
        "기준 정의: 초동 대응 시간 = 접수~확인 시작 / 종결 시간 = 접수~종결 / 번복률 = 번복 건수 ÷ AI 판정 완료 건수",
        "개인정보·정확 좌표 미포함",
      ];
      OP.exporter.csv(`doglink-stats-${DL.ymd(from)}_${DL.ymd(to)}.csv`,
        ["지표", "값"],
        cards.map(c => [c.label, c.value == null ? "데이터 없음" : `${c.value}${c.unit || ""}`]),
        meta);
      OP.logExport("통계 CSV");
      DL.toast("CSV 파일을 생성했습니다.");
    });
    $("#expPdf").addEventListener("click", () => { OP.logExport("통계 인쇄(PDF 대용)"); OP.exporter.printPdf(); });
  }

  /* ══════════ 디자인 시스템 페이지 (운영자 섹션) ══════════ */
  function renderDesignSystem(root) {
    const sample = OP.reports[3]; /* JJ-4817 */
    const em = OP.reports[0];
    root.innerHTML = globalBarHTML("ds") + `<div class="ds-wrap">
      <h1>운영자 콘솔 디자인 시스템</h1>
      <p class="ds-note">SSOT: doglink_design_system_v2.md + 운영자 프롬프트 §8~§10.
        공용 컴포넌트(shared/)는 시민 서비스와 동일 구현을 사용합니다.
        정적 토큰 미리보기는 <a href="../design-system.html">design-system.html</a> 참조.</p>

      <section class="ds-sec"><h2>TriageBadge — AI 판정 전용 (아이콘+라벨+색 3요소)</h2>
        <div class="ds-row">${["emergency", "dispatch", "negative", "analyzing"].map(t => DL.triageBadge(t)).join(" ")}</div>
        <div class="ds-row">대형: ${DL.triageBadge("emergency", "lg")} 소형: ${DL.triageBadge("dispatch", "sm")}</div>
      </section>
      <section class="ds-sec"><h2>StatusBadge — 처리 상태 전용 (트리아지와 혼용 금지)</h2>
        <div class="ds-row">${Object.keys(DL.STATUS_META).map(DL.statusBadge).join(" ")}</div>
      </section>
      <section class="ds-sec"><h2>EmergencyCounter</h2>
        <div class="ds-row">
          <span class="em-counter" data-active="false"><span aria-hidden="true">🚨</span><b>응급 미처리 0건</b></span>
          <span class="em-counter" data-active="true"><span aria-hidden="true">🚨</span><b>응급 미처리 1건</b></span>
          <span class="em-counter" data-active="true"><span aria-hidden="true">🚨</span><b>응급 2건 · 최장 17분 경과</b></span>
        </div>
        <p class="ds-note">0건 neutral / 1건 이상 solid 응급색 / 15분 이상 미처리 시 최장 경과 병기.</p>
      </section>
      <section class="ds-sec"><h2>AgencyQueueRow — 기본·선택·응급</h2>
        <div class="ds-block" role="listbox" aria-label="큐 행 예시">
          ${OP.queueRowHTML(sample, false)}${OP.queueRowHTML(sample, true)}${OP.queueRowHTML(em, false)}
        </div>
        <p class="ds-note">행 높이 48px · 응급 좌측 4px 액센트 · 선택 좌측 2px primary.</p>
      </section>
      <section class="ds-sec"><h2>Button</h2>
        <div class="ds-row"><button class="btn primary">Primary</button><button class="btn">Secondary</button>
          <button class="btn tertiary">Tertiary</button><button class="btn destructive">부정 종결</button>
          <button class="btn" disabled>비활성</button></div>
      </section>
      <section class="ds-sec"><h2>ProcessTimeline</h2>
        <div class="ds-block" style="padding:16px">${DL.processTimeline(OP.timelineSteps(sample))}</div>
      </section>
      <section class="ds-sec"><h2>EmergencyToast (정적 예시 — 실제 토스트는 자동 소멸 없음)</h2>
        <div class="em-toast" style="max-width:360px">
          <div class="t-head"><span aria-hidden="true">🚨</span><span class="t-title">응급 제보 접수 — ${esc(em.reportId)}</span>
            <button class="icon-btn" aria-label="알림 닫기">✕</button></div>
          <div class="t-body"><span class="t-thumb">${DL.photoHTML(em.photos[0])}</span>
            <div class="t-info"><div class="place">${esc(OP.shortAddr(em.location.address))}</div>
              <div class="basis">${esc(em.triage.summary)}</div></div></div>
          <div class="t-acts"><button class="btn primary">사건 열기</button></div>
        </div>
      </section>
      <section class="ds-sec"><h2>상태별 ActionBar 활성 액션 (상태 머신 파생)</h2>
        <table class="data"><thead><tr><th>현재 상태</th><th>활성 액션</th></tr></thead>
        <tbody>${Object.keys(DL.STATUS_META).map(s => `<tr><td>${DL.statusBadge(s)}</td>
          <td>${OP.actionsFor(s).map(a => a.label).join(", ") || "없음"}</td></tr>`).join("")}</tbody></table>
      </section>
      <section class="ds-sec"><h2>빈 상태 · 로딩</h2>
        <div class="ds-row"><div class="empty-state" style="border:1px solid var(--color-border-default);border-radius:12px;min-width:220px">
          <b>조건에 맞는 제보가 없습니다.</b>필터를 초기화해 보세요.</div>
        <div class="loading-state" style="border:1px solid var(--color-border-default);border-radius:12px">
          <span class="dl-spin" aria-hidden="true"></span>불러오는 중…</div></div>
      </section>
    </div>`;
    bindGlobalBar(() => { location.hash = "#/queue?view=list&triage=emergency"; });
    updateRefreshMeta();
  }

  /* ══════════ ShortcutOverlay ══════════ */
  function openShortcutOverlay() {
    const rows = [
      ["↑ / ↓", "큐 행 이동"], ["Enter", "선택 사건 상세 열기"], ["Esc", "상세·오버레이 닫기"],
      ["E", "기관 전달 (확인 중 상태에서)"], ["P", "보호 처리"], ["R", "반환 처리"],
      ["A", "나에게 배정"], ["/", "검색 포커스"], ["?", "단축키 도움말"],
    ];
    const r = ui.selectedId ? OP.getReport(ui.selectedId) : null;
    const avail = new Set(r ? OP.actionsFor(r.status).map(a => a.shortcut).filter(Boolean) : []);
    DL.openDialog({
      title: "키보드 단축키",
      body: `<table class="sc-table">${rows.map(([k, v]) => {
        const isAction = ["E", "P", "R"].includes(k);
        const off = isAction && !avail.has(k);
        return `<tr class="${off ? "na" : ""}"><td><kbd>${k}</kbd></td>
          <td>${esc(v)}${off ? " — 현재 상태에서 사용 불가" : ""}</td></tr>`;
      }).join("")}</table>
      <p style="font-size:12px;color:var(--color-text-secondary);margin:10px 0 0">
        입력 필드에 포커스된 동안 업무 단축키는 비활성화됩니다.</p>`,
      actions: [{ label: "닫기 (Esc)", autofocus: true }],
    });
  }

  /* ══════════ 콘솔 키보드/실시간 훅 (app.js에서 호출) ══════════ */
  const consoleApi = {
    ui, moveFocus, openDetail, closeDetail, openShortcutOverlay,
    renderQueueArea, renderDetail, renderCounter, renderSidebar, updateRefreshMeta,
    focusSearch() { $("#qSearch")?.focus(); },
    actionByShortcut(key) {
      const id = ui.selectedId || ui.focusId;
      if (!id) { DL.toast("먼저 큐에서 사건을 선택해 주세요."); return; }
      const r = OP.getReport(id);
      if (key === "A") {
        const res = OP.assignToMe(id);
        DL.toast(res.ok ? "나에게 배정했습니다." : res.message);
        if (res.ok) { renderDetail(); renderQueueArea(); }
        return;
      }
      const act = OP.actionsFor(r.status).find(a => a.shortcut === key);
      if (!act) { DL.toast(`현재 상태(${DL.STATUS_META[r.status].label})에서는 [${key}] 단축키를 사용할 수 없습니다.`); return; }
      if (!ui.selectedId) openDetail(id);
      requestAction(id, act.targetStatus); /* 단축키도 동일한 확인·검증 경로 */
    },
    enterOnFocus() {
      if (ui.focusId) openDetail(ui.focusId);
    },
    onRealtime(ev) {
      updateRefreshMeta();
      if (!$("#queueArea")) return;
      if (ev.type === "report.emergency" || ev.type === "report.created") {
        renderQueueArea([ev.reportId]); renderCounter(); renderSidebar();
        if (ev.type === "report.emergency") {
          const r = OP.getReport(ev.reportId);
          OP.pushEmergencyToast(r, id => openDetail(id));
          OP.emergencyBeep();
        } else {
          DL.toast(`새 제보 ${ev.reportId}가 접수되었습니다.`);
        }
      } else if (ev.type === "queue.refreshed") {
        renderQueueArea(); renderCounter();
      } else if (ev.type === "report.updated" || ev.type === "report.status_changed" ||
                 ev.type === "report.assigned" || ev.type === "report.merged") {
        /* 현재 mock에서는 본인 조치가 직접 렌더하지만, 실제 realtime adapter 연결 시
           다른 담당자의 변경도 이 경로로 큐·상세에 반영된다. 편집 중인 다이얼로그와
           입력 포커스는 건드리지 않는다 (§14 갱신 규칙). */
        const active = document.activeElement;
        const typing = active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
        if (typing || document.querySelector(".dl-dialog-dim")) return;
        renderQueueArea(); renderCounter(); renderSidebar();
        if (ev.reportId && ev.reportId === ui.selectedId) renderDetail();
      }
    },
    tick() { /* 경과 시간 갱신 (30초) — 입력 포커스는 건드리지 않는다 */
      const active = document.activeElement;
      const typing = active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
      renderCounter(); updateRefreshMeta();
      if (!typing && $("#qlist")) renderQueueArea();
    },
  };

  Object.assign(OP, { renderLogin, renderConsole, renderStats, renderDesignSystem, consoleApi });
})();
