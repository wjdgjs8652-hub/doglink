import { delay } from "./mock-config";

/**
 * 지도·주소 서비스 adapter.
 * Kakao Maps / Naver Maps SDK가 연결되면 이 인터페이스 구현만 교체한다.
 * API 키는 환경 변수(VITE_KAKAO_MAP_KEY 등)로만 주입하고 소스에 하드코딩하지 않는다.
 * 현재는 키가 없으므로 mock map + 주소 검색 폴백을 사용한다.
 */

export interface PlaceResult {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface MapService {
  reverseGeocode(lat: number, lng: number): Promise<string>;
  searchPlaces(query: string): Promise<PlaceResult[]>;
}

/** mock 기준점: 제주시 노형동 인근 */
export const DEFAULT_CENTER = { latitude: 33.4839, longitude: 126.4831 };

const MOCK_PLACES: PlaceResult[] = [
  { name: "노형동 근린공원", address: "제주특별자치도 제주시 노형동 925", latitude: 33.4855, longitude: 126.4788 },
  { name: "제주시청", address: "제주특별자치도 제주시 광양9길 10", latitude: 33.4996, longitude: 126.5312 },
  { name: "연동 신시가지", address: "제주특별자치도 제주시 연동 312", latitude: 33.489, longitude: 126.4983 },
  { name: "이도이동 주민센터", address: "제주특별자치도 제주시 이도이동 1046", latitude: 33.5003, longitude: 126.5296 },
  { name: "함덕해수욕장", address: "제주특별자치도 제주시 조천읍 함덕리", latitude: 33.5434, longitude: 126.6692 },
  { name: "애월읍 하귀리", address: "제주특별자치도 제주시 애월읍 하귀리", latitude: 33.4794, longitude: 126.4022 },
  { name: "서귀포 매일올레시장", address: "제주특별자치도 서귀포시 중앙로62번길 18", latitude: 33.2495, longitude: 126.5637 },
  { name: "중문관광단지", address: "제주특별자치도 서귀포시 중문동", latitude: 33.2496, longitude: 126.412 },
];

const MOCK_NEIGHBORHOODS = [
  "노형동", "연동", "이도이동", "삼도일동", "아라일동", "외도일동", "화북일동", "도남동",
];

const mockMapService: MapService = {
  async reverseGeocode(lat, lng) {
    await delay(250);
    // 좌표를 기반으로 일관된 mock 주소 생성
    const idx =
      Math.abs(Math.round(lat * 1000) + Math.round(lng * 1000)) %
      MOCK_NEIGHBORHOODS.length;
    const lot = (Math.abs(Math.round(lat * 10000) + Math.round(lng * 10000)) % 900) + 100;
    return `제주특별자치도 제주시 ${MOCK_NEIGHBORHOODS[idx]} ${lot} 인근`;
  },
  async searchPlaces(query) {
    await delay(300);
    const q = query.trim();
    if (!q) return [];
    return MOCK_PLACES.filter(
      (p) => p.name.includes(q) || p.address.includes(q),
    );
  },
};

export const mapService: MapService = mockMapService;

/** 공개 화면용 위치 라벨: 정확한 좌표·지번을 제거하고 동/읍 단위 범위만 남긴다. */
export function toPublicLocationLabel(address: string): string {
  const cleaned = address.replace(/\s*인근\s*$/, "");
  const parts = cleaned.split(/\s+/);
  const regionParts = parts.filter((p) => !/^\d/.test(p)).slice(0, 3);
  return `${regionParts.join(" ")} 주변`;
}
