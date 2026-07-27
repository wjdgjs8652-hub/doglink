import { useCallback, useEffect, useRef, useState } from "react";
import type { ReportLocation } from "../types/report";
import { GeoError, getCurrentPosition } from "../services/geolocation-service";
import {
  DEFAULT_CENTER,
  mapService,
  type PlaceResult,
} from "../services/map-service";
import { Button } from "./Button";
import { InlineNotice } from "./InlineNotice";
import "./LocationPicker.css";

export interface LocationPickerProps {
  value: ReportLocation | null;
  onChange(location: ReportLocation | null): void;
}

/**
 * 위치 확인 컴포넌트.
 * 지도 SDK 키가 없는 환경이므로 mock map(드래그로 핀 이동)을 제공하고,
 * GPS 거부·실패 시에도 주소 검색·직접 입력으로 제보를 이어갈 수 있다.
 * 실제 지도 연동 시 map-service adapter만 교체하면 된다.
 */
export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [geoState, setGeoState] = useState<
    "idle" | "locating" | "located" | "denied" | "error"
  >(value ? "located" : "idle");
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualAddress, setManualAddress] = useState("");

  const mapRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const requestSeq = useRef(0);

  const applyCoords = useCallback(
    async (lat: number, lng: number, source: ReportLocation["source"]) => {
      const seq = ++requestSeq.current;
      setAddressLoading(true);
      try {
        const address = await mapService.reverseGeocode(lat, lng);
        if (seq !== requestSeq.current) return;
        onChange({ latitude: lat, longitude: lng, address, source });
      } catch {
        if (seq !== requestSeq.current) return;
        setGeoMessage(
          "주소를 불러오지 못했어요. 주소를 검색해서 직접 지정할 수 있습니다.",
        );
      } finally {
        if (seq === requestSeq.current) setAddressLoading(false);
      }
    },
    [onChange],
  );

  const locate = useCallback(async () => {
    setGeoState("locating");
    setGeoMessage(null);
    try {
      const pos = await getCurrentPosition();
      setGeoState("located");
      await applyCoords(pos.latitude, pos.longitude, "gps");
    } catch (err) {
      if (err instanceof GeoError && err.reason === "denied") {
        setGeoState("denied");
        setGeoMessage(err.message);
      } else {
        setGeoState("error");
        setGeoMessage(
          err instanceof GeoError
            ? err.message
            : "위치를 확인하지 못했어요. 주소를 검색해서 직접 지정할 수 있습니다.",
        );
      }
    }
  }, [applyCoords]);

  // 최초 진입 시 위치가 없으면 자동으로 한 번 시도
  useEffect(() => {
    if (!value && geoState === "idle") {
      void locate();
    }
    // eslint 없이도 의도를 명확히: 마운트 시 1회
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** mock map: 드래그하면 좌표를 미세 이동 */
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    const base = value ?? { ...DEFAULT_CENTER, address: "", source: "manual" as const };
    const lat = base.latitude - relY * 0.01;
    const lng = base.longitude + relX * 0.01;
    onChange({ ...base, latitude: lat, longitude: lng });
  };

  const handlePointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (value) {
      void applyCoords(value.latitude, value.longitude, value.source);
    }
  };

  const runSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchResults(null);
    try {
      setSearchResults(await mapService.searchPlaces(q));
    } catch {
      setGeoMessage("검색에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSearching(false);
    }
  };

  const pickPlace = (place: PlaceResult) => {
    onChange({
      latitude: place.latitude,
      longitude: place.longitude,
      address: place.address,
      source: "search",
    });
    setGeoState("located");
    setSearchResults(null);
    setSearchQuery("");
  };

  const applyManualAddress = () => {
    const addr = manualAddress.trim();
    if (!addr) return;
    onChange({
      latitude: DEFAULT_CENTER.latitude,
      longitude: DEFAULT_CENTER.longitude,
      address: addr,
      source: "manual",
    });
    setGeoState("located");
    setManualMode(false);
  };

  return (
    <div className="location-picker">
      {/* mock map: 실제 SDK 연결 전 위치 조정용 */}
      <div
        ref={mapRef}
        className="location-picker__map"
        role="application"
        aria-label="발견 위치 지도. 지도를 드래그해 핀 위치를 조정할 수 있어요."
        onPointerDown={(e) => {
          dragging.current = true;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="location-picker__grid" aria-hidden="true" />
        <div className="location-picker__pin" aria-hidden="true">
          <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
            <path
              d="M16 2C9.4 2 4 7.4 4 14c0 8.4 12 24 12 24s12-15.6 12-24c0-6.6-5.4-12-12-12z"
              fill="var(--color-primary-500)"
              stroke="var(--color-primary-700)"
              strokeWidth="1.5"
            />
            <circle cx="16" cy="14" r="4.5" fill="white" />
          </svg>
        </div>
        {geoState === "locating" && (
          <p className="location-picker__map-status" aria-live="polite">
            현재 위치를 확인하고 있어요…
          </p>
        )}
        <p className="location-picker__map-note">위치 미리보기</p>
      </div>

      <div className="location-picker__address card" aria-live="polite">
        <span className="location-picker__address-label">발견 위치</span>
        <p className="location-picker__address-value">
          {addressLoading
            ? "주소를 확인하고 있어요…"
            : (value?.address ?? "아직 위치가 지정되지 않았어요.")}
        </p>
      </div>

      {geoMessage && (
        <InlineNotice variant="warning" live="polite">
          {geoMessage}
        </InlineNotice>
      )}

      <div className="location-picker__tools">
        <Button
          variant="secondary"
          onClick={() => void locate()}
          loading={geoState === "locating"}
        >
          현재 위치 다시 찾기
        </Button>
        <Button variant="secondary" onClick={() => setManualMode((v) => !v)}>
          주소 직접 입력
        </Button>
      </div>

      <div className="location-picker__search">
        <label className="location-picker__search-label" htmlFor="place-search">
          위치 검색
        </label>
        <div className="location-picker__search-row">
          <input
            id="place-search"
            type="search"
            className="location-picker__input"
            placeholder="장소명 또는 주소 검색 (예: 노형동)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runSearch();
            }}
          />
          <Button
            variant="primary"
            onClick={() => void runSearch()}
            loading={searching}
            disabled={!searchQuery.trim()}
          >
            검색
          </Button>
        </div>
        {searchResults && (
          <ul className="location-picker__results" aria-label="검색 결과">
            {searchResults.length === 0 && (
              <li className="location-picker__no-result">
                검색 결과가 없어요. 다른 이름으로 검색하거나 주소를 직접 입력해
                주세요.
              </li>
            )}
            {searchResults.map((place) => (
              <li key={`${place.latitude}-${place.longitude}`}>
                <button
                  type="button"
                  className="location-picker__result"
                  onClick={() => pickPlace(place)}
                >
                  <span className="location-picker__result-name">{place.name}</span>
                  <span className="location-picker__result-addr">{place.address}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {manualMode && (
        <div className="location-picker__manual">
          <label className="location-picker__search-label" htmlFor="manual-address">
            발견한 곳의 주소나 위치 설명
          </label>
          <div className="location-picker__search-row">
            <input
              id="manual-address"
              type="text"
              className="location-picker__input"
              placeholder="예: 제주시 노형동 ○○아파트 앞 공원"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyManualAddress();
              }}
            />
            <Button
              variant="primary"
              onClick={applyManualAddress}
              disabled={!manualAddress.trim()}
            >
              적용
            </Button>
          </div>
        </div>
      )}

      <InlineNotice variant="info">
        정확한 위치는 담당 기관에서만 확인하며, 공개 화면에는 주변 범위로
        표시됩니다.
      </InlineNotice>
    </div>
  );
}
