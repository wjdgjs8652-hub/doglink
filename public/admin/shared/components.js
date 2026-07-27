/* ═══════════════════════════════════════════════════════════════════
   doglink 공용 컴포넌트/유틸 — 시민 서비스·운영자 콘솔 공동 사용
   TriageBadge / StatusBadge / ProcessTimeline / Dialog / Toast /
   날짜·시간·사건번호 표시 규칙 / XSS 이스케이프
   전역 네임스페이스: window.DL  (빌드 도구 없는 정적 환경 — file:// 호환)
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ── XSS 방지: 사용자 입력을 DOM에 넣을 때 반드시 esc()를 거친다 ── */
  const esc = s => String(s ?? "").replace(/[&<>"']/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ── 날짜·시간 표시 규칙 (두 서비스 공통) ── */
  const pad = n => String(n).padStart(2, "0");
  const hhmm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const hhmmss = d => `${hhmm(d)}:${pad(d.getSeconds())}`;
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const ymdhm = d => `${ymd(d)} ${hhmm(d)}`;
  const ymdhms = d => `${ymd(d)} ${hhmmss(d)}`;
  /* 상대 시간 — 항상 절대 시간과 함께 접근 가능하게 제공할 것 */
  function relTime(d, base) {
    const diff = Math.max(0, (base ?? Date.now()) - d.getTime());
    const m = Math.floor(diff / 60000);
    if (m < 1) return "방금";
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    return `${Math.floor(h / 24)}일 전`;
  }
  function durText(ms) {
    if (ms == null || !isFinite(ms)) return "—";
    const m = Math.max(0, Math.round(ms / 60000));
    if (m < 60) return `${m}분`;
    const h = Math.floor(m / 60), r = m % 60;
    if (h < 24) return r ? `${h}시간 ${r}분` : `${h}시간`;
    const dd = Math.floor(h / 24);
    return h % 24 ? `${dd}일 ${h % 24}시간` : `${dd}일`;
  }

  /* ── ★ AI 트리아지 메타 — 처리 상태와 별개 차원. TriageBadge로만 표현 ── */
  const TRIAGE = {
    emergency:   { icon: "🚨", label: "응급",       order: 0 },
    dispatch:    { icon: "🚗", label: "출동",       order: 1 },
    analyzing:   { icon: "◌",  label: "AI 분석 중", order: 2 },
    unavailable: { icon: "◌",  label: "판정 불가",  order: 2 },
    negative:    { icon: "✓",  label: "부정",       order: 3 },
  };
  /* size: "" | "lg" | "sm".  판정은 단정형으로 쓰지 않는다 — 라벨은 분류명만 */
  function triageBadge(type, size = "", extraLabel = "") {
    const m = TRIAGE[type] || TRIAGE.analyzing;
    return `<span class="triage${size ? " " + size : ""}" data-state="${esc(type)}">` +
      `<span class="ti" aria-hidden="true">${m.icon}</span>${m.label}${extraLabel}</span>`;
  }

  /* ── 처리 상태 메타 (운영자 8단계 상태 머신과 시민 표기 공용) ──
     variant는 StatusBadge 전용 5종. 역할 고정: 주황=출동/대기, 보라=기관 전달,
     초록=완료(보호/반환), 회색=부정/비활성 */
  const STATUS_META = {
    submitted:       { label: "접수됨",    variant: "neutral"  },
    reviewing:       { label: "확인 중",   variant: "pending"  },
    transferred:     { label: "기관 전달", variant: "transfer" },
    dispatched:      { label: "출동",      variant: "pending"  },
    protected:       { label: "보호",      variant: "success"  },
    returned:        { label: "반환",      variant: "success"  },
    negative_closed: { label: "부정 종결", variant: "neutral"  },
    closed:          { label: "종결",      variant: "neutral"  },
  };
  function statusBadge(status) {
    const m = STATUS_META[status] || { label: status, variant: "neutral" };
    return `<span class="badge" data-variant="${m.variant}">${esc(m.label)}</span>`;
  }

  /* ── ProcessTimeline — 제보됨→AI 판정→확인 중→기관 전달/출동→보호/반환→종결
     steps: [{name, at:Date|null, state:"done"|"now"|"todo", note?, negative?, seconds?}]
     응급 자동신고처럼 수 초 내 진행된 단계는 seconds:true로 초 단위 표시 (B2G 시연 포인트) */
  function processTimeline(steps) {
    const items = steps.map(s => {
      const time = s.at
        ? `<time class="ptl-time" datetime="${s.at.toISOString()}">${s.seconds ? ymdhms(s.at) : ymdhm(s.at)}</time>`
        : "";
      const note = s.note ? `<span class="ptl-note">${s.note}</span>` : "";
      return `<li class="${s.state}${s.negative ? " negative" : ""}">` +
        `<span class="ptl-name">${esc(s.name)}</span>${time}${note}</li>`;
    }).join("");
    return `<ol class="ptl">${items}</ol>`;
  }

  /* ── Toast (일반 정보용 — 응급 알림은 EmergencyToast 사용, 자동 소멸 금지) ── */
  function toast(msg, ms = 2600) {
    let host = document.querySelector(".dl-toasts");
    if (!host) {
      host = document.createElement("div");
      host.className = "dl-toasts";
      host.setAttribute("role", "status");
      host.setAttribute("aria-live", "polite");
      document.body.appendChild(host);
    }
    const el = document.createElement("div");
    el.className = "dl-toast";
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  /* ── Dialog — 포커스 트랩 + Esc 닫기 + 닫은 뒤 이전 포커스 복원 ──
     openDialog({title, body, actions:[{label,className,onClick,autofocus}], onClose, wide})
     onClick이 false를 반환하면 다이얼로그를 닫지 않는다(검증 실패 등). */
  function openDialog(opts) {
    const prevFocus = document.activeElement;
    const dim = document.createElement("div");
    dim.className = "dl-dialog-dim";
    dim.innerHTML =
      `<div class="dl-dialog" role="dialog" aria-modal="true" aria-label="${esc(opts.title)}"` +
      `${opts.wide ? ' style="max-width:720px"' : ""}>` +
      `<div class="dl-dialog-head"><h2>${esc(opts.title)}</h2>` +
      `<button class="icon-btn" data-close aria-label="닫기">✕</button></div>` +
      `<div class="dl-dialog-body">${opts.body}</div>` +
      `<div class="dl-dialog-foot"></div></div>`;
    const foot = dim.querySelector(".dl-dialog-foot");
    const api = { root: dim, close };
    (opts.actions || []).forEach(a => {
      const b = document.createElement("button");
      b.className = "btn " + (a.className || "");
      b.textContent = a.label;
      if (a.autofocus) b.dataset.autofocus = "1";
      b.addEventListener("click", () => {
        if (a.onClick && a.onClick(api) === false) return;
        close();
      });
      foot.appendChild(b);
    });
    if (!opts.actions || !opts.actions.length) foot.remove();

    function close() {
      dim.remove();
      document.removeEventListener("keydown", onKey, true);
      if (prevFocus && prevFocus.focus) prevFocus.focus();
      if (opts.onClose) opts.onClose();
    }
    function focusables() {
      return [...dim.querySelectorAll("button,[href],input,select,textarea,[tabindex]:not([tabindex='-1'])")]
        .filter(el => !el.disabled && el.offsetParent !== null);
    }
    function onKey(e) {
      if (e.key === "Escape") { e.stopPropagation(); close(); }
      if (e.key === "Tab") {
        const f = focusables();
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    dim.querySelector("[data-close]").addEventListener("click", close);
    dim.addEventListener("mousedown", e => { if (e.target === dim) close(); });
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(dim);
    const auto = dim.querySelector("[data-autofocus]") ||
      dim.querySelector(".dl-dialog-body input, .dl-dialog-body select, .dl-dialog-body textarea") ||
      dim.querySelector("[data-close]");
    auto.focus();
    return api;
  }

  /* ── 시연용 강아지 사진(인라인 SVG — 외부 리소스 없음) ── */
  function dogSVG(coat, patt = "") {
    const C = { "검정": "#3b3f46", "갈색": "#8a5a34", "흰색": "#e7e3dc", "베이지": "#d3b78e", "회색": "#8b9099" }[coat] || "#a0784f";
    const spot = patt.includes("얼룩") || patt.includes("점") || patt.includes("무늬");
    return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img">
      <rect width="64" height="64" fill="#cfe3f5"/><rect y="44" width="64" height="20" fill="#b9cfe0"/>
      <ellipse cx="30" cy="42" rx="17" ry="10" fill="${C}"/><circle cx="46" cy="30" r="10" fill="${C}"/>
      <ellipse cx="52" cy="32" rx="6" ry="4" fill="${C}"/><path d="M40 22 l-3 -9 l9 4 z" fill="${C}"/>
      <circle cx="49" cy="28" r="1.6" fill="#1b1d21"/><circle cx="56" cy="32" r="1.4" fill="#1b1d21"/>
      <path d="M15 40 q-8 -6 -6 -13" stroke="${C}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <rect x="22" y="49" width="4" height="9" rx="2" fill="${C}"/><rect x="34" y="49" width="4" height="9" rx="2" fill="${C}"/>
      ${spot ? `<circle cx="26" cy="40" r="4" fill="#fff" opacity=".55"/><circle cx="36" cy="45" r="2.6" fill="#fff" opacity=".45"/>` : ""}
    </svg>`;
  }

  /* ── 사진 렌더링: 실제 URL이 있으면 <img>, 없으면 시연용 SVG ── */
  function photoHTML(p) {
    if (p && typeof p.url === "string" && /^https?:\/\//.test(p.url)) {
      return `<img class="photo-img" src="${esc(p.url)}" alt="${esc(p.alt || "제보 사진")}" loading="lazy">`;
    }
    return dogSVG(p && p.coat, (p && p.patt) || "");
  }

  window.DL = {
    esc, pad, hhmm, hhmmss, ymd, ymdhm, ymdhms, relTime, durText,
    TRIAGE, triageBadge, STATUS_META, statusBadge, processTimeline,
    toast, openDialog, dogSVG, photoHTML,
  };
})();
