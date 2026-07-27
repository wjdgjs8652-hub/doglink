/* ═══════════════════════════════════════════════════════════════════
   DOG-LINK 운영자 콘솔 — Google Maps adapter
   제보 큐의 지도 보기(O2-Map)를 Google Maps JavaScript API로 렌더링한다.

   - 키는 runtime-config.js(window.DOGLINK_CONFIG.googleMapsKey)로만 주입
     (빌드 시 VITE_GOOGLE_MAPS_KEY 환경 변수에서 생성 — 소스 커밋 금지)
   - 키 미설정·스크립트 로드 실패 시 screens.js가 기존 mock SVG 지도로 폴백
   - 운영자 화면이므로 정확 좌표를 표시한다 (시민 화면에는 범위만 전달)
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const OP = window.OP;
  const cfg = window.DOGLINK_CONFIG || {};
  const KEY = String(cfg.googleMapsKey || "").trim();

  /* 제주 전역 기본 뷰 */
  const JEJU_CENTER = { lat: 33.38, lng: 126.55 };

  const TRIAGE_STYLE = {
    emergency: { color: "#D32F2F", scale: 11, label: "!" },
    dispatch: { color: "#E8940A", scale: 9, label: "" },
    negative: { color: "#8C9590", scale: 6, label: "" },
    analyzing: { color: "#526ED8", scale: 8, label: "" },
    unavailable: { color: "#526ED8", scale: 8, label: "" },
  };

  let loadPromise = null;

  /* 키 거부(도메인 제한·비활성 키 등) 시 Google이 호출하는 전역 훅 —
     스크립트 로드는 성공하므로 onerror로 잡히지 않는다 */
  let authFailHandler = null;
  window.gm_authFailure = function () {
    if (authFailHandler) authFailHandler();
  };

  function load() {
    if (!KEY) return Promise.reject(new Error("Google Maps 키 미설정"));
    if (window.google && window.google.maps && window.google.maps.Map) {
      return Promise.resolve();
    }
    if (loadPromise) return loadPromise;
    loadPromise = new Promise((resolve, reject) => {
      window.__doglinkGmapInit = resolve;
      const s = document.createElement("script");
      s.src =
        "https://maps.googleapis.com/maps/api/js?key=" +
        encodeURIComponent(KEY) +
        "&callback=__doglinkGmapInit&loading=async&language=ko&region=KR";
      s.async = true;
      s.onerror = () => {
        loadPromise = null;
        reject(new Error("Google Maps 스크립트 로드 실패"));
      };
      document.head.appendChild(s);
      /* 잘못된 키 등으로 콜백이 오지 않는 경우 대비 */
      setTimeout(() => reject(new Error("Google Maps 로드 시간 초과")), 12000);
    });
    return loadPromise;
  }

  /**
   * 지도 렌더링. renderQueueArea가 DOM을 다시 만들 때마다 호출된다.
   * @param el        지도 컨테이너
   * @param rows      큐 목록 (운영자용 — 정확 좌표 포함)
   * @param handlers  { onSelect(reportId) } 상세 열기
   */
  /* 마지막 렌더의 지도·마커 레퍼런스 — 좌표 목록에서 위치 이동(focus)에 사용 */
  let lastMap = null;
  let lastMarkers = {};
  /* 사용자가 보던 카메라(중심·줌) — 상세 열기 등으로 지도가 다시 그려져도
     초기 화면으로 되돌아가지 않도록 보존한다 */
  let savedCam = null;

  function render(el, rows, handlers) {
    const gm = window.google.maps;
    lastMarkers = {};
    const map = new gm.Map(el, {
      center: JEJU_CENTER,
      zoom: 10,
      clickableIcons: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      gestureHandling: "greedy",
    });

    const info = new gm.InfoWindow();
    const bounds = new gm.LatLngBounds();
    let hasPoint = false;

    rows.forEach((r) => {
      const lat = r.location.latitude;
      const lng = r.location.longitude;
      if (typeof lat !== "number" || typeof lng !== "number") return;
      const t = r.triage.currentType;
      const st = TRIAGE_STYLE[t] || TRIAGE_STYLE.unavailable;
      const closed = r.status === "closed" || r.status === "negative_closed";
      const pos = { lat, lng };

      const marker = new gm.Marker({
        map,
        position: pos,
        title: `${r.reportId} — ${window.DL.TRIAGE[t].label}, ${window.DL.STATUS_META[r.status].label}`,
        icon: {
          path: gm.SymbolPath.CIRCLE,
          fillColor: st.color,
          fillOpacity: closed ? 0.35 : 0.95,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          scale: st.scale,
        },
        label: st.label
          ? { text: st.label, color: "#ffffff", fontWeight: "700", fontSize: "12px" }
          : undefined,
        zIndex: t === "emergency" ? 30 : t === "dispatch" ? 20 : 10,
      });

      marker.addListener("click", () => {
        /* InfoWindow 내용은 DOM으로 구성해 XSS 없이 안전하게 렌더 */
        const box = document.createElement("div");
        box.className = "gmap-info";
        const title = document.createElement("div");
        title.className = "gmap-info__title mono";
        title.textContent = r.reportId;
        const badges = document.createElement("div");
        badges.className = "gmap-info__badges";
        badges.innerHTML = window.DL.triageBadge(t, "sm") + window.DL.statusBadge(r.status);
        const addr = document.createElement("div");
        addr.className = "gmap-info__addr";
        addr.textContent = r.location.address;
        const coord = document.createElement("div");
        coord.className = "gmap-info__coord mono";
        coord.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        const btn = document.createElement("button");
        btn.className = "btn sm primary";
        btn.type = "button";
        btn.textContent = "상세 보기";
        btn.addEventListener("click", () => {
          info.close();
          handlers.onSelect(r.reportId);
        });
        box.append(title, badges, addr, coord, btn);
        info.setContent(box);
        info.open({ map, anchor: marker });
      });

      bounds.extend(pos);
      hasPoint = true;
      lastMarkers[r.reportId] = marker;
    });
    lastMap = map;

    if (savedCam) {
      /* 재렌더 — 사용자가 보던 위치·줌 복원 */
      map.setCenter(savedCam.center);
      map.setZoom(savedCam.zoom);
    } else if (hasPoint) {
      map.fitBounds(bounds, 60);
      /* 사건이 1건뿐이면 과확대 방지 */
      gm.event.addListenerOnce(map, "idle", () => {
        if (map.getZoom() > 15) map.setZoom(15);
      });
    }

    /* 카메라 이동이 멈출 때마다 현재 뷰 저장 */
    map.addListener("idle", () => {
      const c = map.getCenter();
      if (c) savedCam = { center: { lat: c.lat(), lng: c.lng() }, zoom: map.getZoom() };
    });

    /* 상세 패널이 열린 사건은 재렌더 후에도 요약 카드를 유지 */
    if (handlers.focusId && lastMarkers[handlers.focusId]) {
      gm.event.trigger(lastMarkers[handlers.focusId], "click");
    }
    return map;
  }

  /* 지도를 해당 사건 위치로 이동하고 요약 카드를 연다 */
  function focus(reportId) {
    const marker = lastMarkers[reportId];
    if (!marker || !lastMap) return false;
    lastMap.panTo(marker.getPosition());
    if (lastMap.getZoom() < 14) lastMap.setZoom(14);
    window.google.maps.event.trigger(marker, "click");
    return true;
  }

  OP.gmap = {
    isConfigured: () => Boolean(KEY),
    load,
    render,
    focus,
    onAuthFailure(fn) {
      authFailHandler = fn;
    },
  };
})();
