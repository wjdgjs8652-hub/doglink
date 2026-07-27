/* ═══════════════════════════════════════════════════════════════════
   DOG-LINK 운영자 콘솔 — 전용 컴포넌트 빌더
   GlobalBar / EmergencyCounter / AgencyQueueRow / EmergencyToast /
   ProcessTimeline(사건→단계 매핑) / StatCard / TrendChart / 사진 뷰어
   공용 배지·타임라인·다이얼로그는 shared/components.js(DL)를 재사용한다.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const OP = window.OP, DL = window.DL;
  const esc = DL.esc;

  /* ── EmergencyCounter ── */
  function emergencyCounterHTML() {
    const s = OP.emergencySummary();
    const active = s.count > 0;
    let text = `응급 미처리 ${s.count}건`;
    if (active && s.oldestWaitingMinutes >= 15)
      text = `응급 ${s.count}건 · 최장 ${DL.durText(s.oldestWaitingMinutes * 60000)} 경과`;
    else if (active) text = `응급 미처리 ${s.count}건`;
    return `<button class="em-counter" id="emCounter" data-active="${active}"
      aria-live="assertive" aria-label="${esc(text)} — 누르면 응급 필터를 적용합니다">
      <span aria-hidden="true">🚨</span><b>${esc(text)}</b></button>`;
  }

  /* ── AgencyQueueRow — 좌→우: TriageBadge·시간·사건번호·썸네일·요약·위치·StatusBadge·담당자 ── */
  function queueRowHTML(r, selected) {
    const abs = DL.ymdhm(r.submittedAt);
    const assg = r.assignee
      ? `<span class="qassg">${esc(r.assignee.displayName)}</span>`
      : `<span class="qassg none">미배정</span>`;
    /* 스크린리더 낭독 순서: 트리아지→시간→사건번호→요약→위치→상태→담당자 */
    return `<div class="qrow" role="option" id="qr-${esc(r.reportId)}" data-id="${esc(r.reportId)}"
        data-tri="${esc(r.triage.currentType)}" aria-selected="${!!selected}" tabindex="-1"
        aria-label="${esc(`${DL.TRIAGE[r.triage.currentType].label}. ${DL.relTime(r.submittedAt)}, ${abs}. 사건번호 ${r.reportId}. ${r.aiSummary}. ${r.location.address}. ${DL.STATUS_META[r.status].label}. ${r.assignee ? "담당자 " + r.assignee.displayName : "담당자 미배정"}`)}">
      ${DL.triageBadge(r.triage.currentType, "sm")}
      <span class="qtime" title="${esc(abs)}">${esc(DL.relTime(r.submittedAt))}<small>${esc(DL.hhmm(r.submittedAt))}</small></span>
      <span class="qid">${esc(r.reportId)}</span>
      <span class="qthumb" aria-hidden="true">${DL.dogSVG(r.photos[0].coat, r.photos[0].patt)}</span>
      <span class="qsum" title="${esc(r.aiSummary)}">${esc(r.aiSummary)}</span>
      <span class="qaddr" title="${esc(r.location.address)}">${esc(shortAddr(r.location.address))}</span>
      ${DL.statusBadge(r.status)}
      ${assg}
    </div>`;
  }
  function shortAddr(a) { return a.replace("제주특별자치도 ", ""); }

  /* ── ProcessTimeline: 사건 → 공용 타임라인 단계 매핑 ──
     제보됨 → AI 판정 → 확인 중 → 기관 전달/출동 → 보호/반환 → 종결 */
  function timelineSteps(r) {
    const at = st => { const e = r.timeline.find(e => e.status === st); return e ? e.occurredAt : null; };
    const auto = r.isEmergencyAutoSubmitted;
    const submittedNote = r.timeline.find(e => e.status === "submitted")?.note;
    if (r.status === "negative_closed") {
      return [
        { name: "제보됨", at: r.submittedAt, state: "done", note: submittedNote, seconds: auto },
        { name: "AI 판정", at: r.triage.analyzedAt, state: "done", note: `트리아지: ${DL.TRIAGE[r.triage.currentType].label}`, seconds: auto },
        { name: "부정 종결", at: at("negative_closed"), state: "done", negative: true },
      ];
    }
    const mid = at("transferred") ? "transferred" : "dispatched";
    const midAt = at("transferred") || at("dispatched");
    const endAt = at("protected") || at("returned");
    const endName = at("protected") ? "보호" : at("returned") ? "반환" : "보호 / 반환";
    const closedAt = at("closed");
    const order = ["submitted", "reviewing", mid, endAt ? "end" : "end", "closed"];
    const idx = { submitted: 0, reviewing: 1, transferred: 2, dispatched: 2, protected: 3, returned: 3, closed: 4 }[r.status] ?? 0;
    const stateOf = i => i < idx ? "done" : i === idx ? (r.status === "closed" ? "done" : "now") : "todo";
    return [
      { name: "제보됨", at: r.submittedAt, state: "done", note: submittedNote, seconds: auto },
      { name: "AI 판정", at: r.triage.analyzedAt, state: "done", note: `트리아지: ${DL.TRIAGE[r.triage.currentType].label} (표시 전용 주석 — 처리 단계 아님)`, seconds: auto },
      { name: "확인 중", at: at("reviewing"), state: stateOf(1), seconds: auto && !!at("reviewing") },
      { name: at("transferred") ? "기관 전달" : at("dispatched") ? "출동" : "기관 전달 / 출동", at: midAt, state: stateOf(2), seconds: auto && !!midAt },
      { name: endName, at: endAt, state: stateOf(3) },
      { name: "종결", at: closedAt, state: r.status === "closed" ? "done" : "todo" },
    ];
  }

  /* ── EmergencyToast — 자동 소멸 없음, 사건당 1개(중복 방지) ── */
  const toastOpen = new Set();
  function pushEmergencyToast(r, onOpen) {
    if (toastOpen.has(r.reportId)) return;
    let host = document.querySelector(".em-toasts");
    if (!host) {
      host = document.createElement("div");
      host.className = "em-toasts";
      host.setAttribute("role", "alert");        /* 스크린리더 assertive 안내 */
      host.setAttribute("aria-live", "assertive");
      document.body.appendChild(host);
    }
    toastOpen.add(r.reportId);
    const el = document.createElement("div");
    el.className = "em-toast";
    el.dataset.id = r.reportId;
    el.innerHTML =
      `<div class="t-head"><span aria-hidden="true">🚨</span>
        <span class="t-title">응급 제보 접수 — ${esc(r.reportId)}</span>
        <button class="icon-btn" data-x aria-label="알림 닫기 (응급 카운터와 큐 상단 고정은 유지됩니다)">✕</button></div>
      <div class="t-body">
        <span class="t-thumb" aria-hidden="true">${DL.dogSVG(r.photos[0].coat, r.photos[0].patt)}</span>
        <div class="t-info">
          <div class="place">${esc(shortAddr(r.location.address))}</div>
          <div class="mono" style="font-size:11.5px;color:var(--color-text-secondary)">${esc(DL.ymdhms(r.submittedAt))} 접수</div>
          <div class="basis">${esc(r.triage.summary)}</div>
        </div>
      </div>
      <div class="t-acts"><button class="btn primary" data-open>사건 열기</button></div>`;
    el.querySelector("[data-x]").addEventListener("click", () => { toastOpen.delete(r.reportId); el.remove(); });
    el.querySelector("[data-open]").addEventListener("click", () => {
      toastOpen.delete(r.reportId); el.remove(); onOpen(r.reportId);
    });
    host.appendChild(el); /* 포커스를 강제로 가져오지 않는다 */
  }

  /* ── 보조 사운드 (설정 켜짐 시에만 — 시각 알림을 대체하지 않음) ── */
  function emergencyBeep() {
    if (!OP.settings.get().sound) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = 880;
      gain.gain.setValueAtTime(.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + .5);
    } catch { /* 사운드 실패는 무시 — 시각 경로가 항상 존재 */ }
  }

  /* ── StatCard ── */
  function statCardHTML(c) {
    const val = c.value == null
      ? `<div class="val na">${esc(c.naText || "집계할 데이터 없음")}</div>`
      : `<div class="val">${esc(String(c.value))}${c.unit ? `<small>${esc(c.unit)}</small>` : ""}</div>`;
    return `<div class="stat-card"><div class="lab">${esc(c.label)}</div>${val}
      <div class="def">${esc(c.definition)}</div></div>`;
  }

  /* ── TrendChart — 색상 외 라벨·마커 병기, 아래에 데이터 표 제공 ── */
  function trendChartSVG(trend) {
    if (!trend.length) return `<div class="empty-state"><b>표시할 추이 데이터가 없습니다</b>기간을 조정해 보세요.</div>`;
    const W = 720, H = 220, padL = 36, padB = 30, padT = 14;
    const max = Math.max(...trend.map(d => d.total), 1);
    const bw = Math.min(48, (W - padL - 10) / trend.length * 0.55);
    const x = i => padL + (i + .5) * ((W - padL - 10) / trend.length);
    const y = v => H - padB - (v / max) * (H - padB - padT);
    const gridN = Math.min(max, 4);
    let g = "";
    for (let i = 0; i <= gridN; i++) {
      const v = Math.round(max * i / gridN), yy = y(v);
      g += `<line x1="${padL}" x2="${W - 6}" y1="${yy}" y2="${yy}" stroke="var(--color-divider)"/>` +
        `<text x="${padL - 6}" y="${yy + 4}" text-anchor="end" font-size="10" fill="var(--color-text-tertiary)">${v}</text>`;
    }
    const bars = trend.map((d, i) =>
      `<rect x="${x(i) - bw / 2}" y="${y(d.total)}" width="${bw}" height="${Math.max(1, H - padB - y(d.total))}"
         rx="2" fill="var(--color-primary-500)"><title>${esc(d.date)} 총 ${d.total}건</title></rect>` +
      `<text x="${x(i)}" y="${H - padB + 14}" text-anchor="middle" font-size="9.5"
         fill="var(--color-text-secondary)">${esc(d.date.slice(5))}</text>`).join("");
    /* 응급 시리즈 — 트리아지 데이터에만 응급색 + ▲ 마커로 이중 부호화 */
    const emPts = trend.map((d, i) => `${x(i)},${y(d.emergency)}`).join(" ");
    const emMarks = trend.map((d, i) =>
      `<path d="M${x(i)} ${y(d.emergency) - 5} l5 8 h-10 z" fill="var(--triage-emergency-solid)">
        <title>${esc(d.date)} 응급 ${d.emergency}건</title></path>`).join("");
    return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img"
      aria-label="일자별 제보량 추이 차트. 동일한 데이터가 아래 표에 제공됩니다">
      ${g}${bars}
      <polyline points="${emPts}" fill="none" stroke="var(--triage-emergency-solid)" stroke-width="2"/>
      ${emMarks}</svg>`;
  }

  /* ── 사진 뷰어 (상세 패널) — 확대·축소·이전·다음·전체 화면, 키보드 접근 ── */
  function initPhotoViewer(root, report) {
    const el = root.querySelector(".pviewer");
    if (!el) return;
    let idx = 0, zoom = 1;
    const imgBox = el.querySelector(".img");
    const cnt = el.querySelector(".cnt");
    function draw() {
      const p = report.photos[idx];
      imgBox.innerHTML = DL.dogSVG(p.coat, p.patt);
      const svg = imgBox.querySelector("svg");
      svg.style.transform = `scale(${zoom})`;
      svg.setAttribute("aria-label", p.alt);
      svg.setAttribute("role", "img");
      cnt.textContent = `${idx + 1} / ${report.photos.length}`;
      el.querySelectorAll(".thumbs button").forEach((b, i) => b.setAttribute("aria-current", i === idx));
    }
    el.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.act === "prev") { idx = (idx - 1 + report.photos.length) % report.photos.length; zoom = 1; }
      if (b.dataset.act === "next") { idx = (idx + 1) % report.photos.length; zoom = 1; }
      if (b.dataset.act === "zin") zoom = Math.min(3, zoom + .5);
      if (b.dataset.act === "zout") zoom = Math.max(1, zoom - .5);
      if (b.dataset.act === "full") {
        const p = report.photos[idx];
        DL.openDialog({
          title: `${report.reportId} 사진 ${idx + 1}/${report.photos.length}`,
          body: `<div class="photo-full">${DL.dogSVG(p.coat, p.patt)}</div>
                 <p style="font-size:12px;color:var(--color-text-secondary);margin:8px 0 0">${esc(p.alt)}</p>`,
          wide: true,
        });
      }
      if (b.dataset.thumb != null) { idx = +b.dataset.thumb; zoom = 1; }
      draw();
    });
    draw();
  }
  function photoViewerHTML(report) {
    const many = report.photos.length > 1;
    return `<div class="pviewer">
      <div class="stage">
        <div class="img"></div>
        <div class="pnav">
          <button class="icon-btn" data-act="prev" aria-label="이전 사진" ${many ? "" : "disabled"}>‹</button>
          <button class="icon-btn" data-act="next" aria-label="다음 사진" ${many ? "" : "disabled"}>›</button>
          <span class="cnt"></span>
          <button class="icon-btn" data-act="zout" aria-label="축소">−</button>
          <button class="icon-btn" data-act="zin" aria-label="확대">＋</button>
          <button class="icon-btn" data-act="full" aria-label="전체 화면 보기">⛶</button>
        </div>
      </div>
      ${many ? `<div class="thumbs">${report.photos.map((p, i) =>
        `<button data-thumb="${i}" aria-label="사진 ${i + 1} 보기">${DL.dogSVG(p.coat, p.patt)}</button>`).join("")}</div>` : ""}
    </div>`;
  }

  Object.assign(OP, {
    emergencyCounterHTML, queueRowHTML, timelineSteps, shortAddr,
    pushEmergencyToast, emergencyBeep, statCardHTML, trendChartSVG,
    photoViewerHTML, initPhotoViewer,
  });
})();
