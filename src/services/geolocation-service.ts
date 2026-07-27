/**
 * 브라우저 위치 서비스.
 * 권한 거부·시간 초과 시에도 제보가 중단되지 않도록
 * 호출 측에서 폴백(주소 검색, 직접 입력)을 제공한다.
 */

export interface GeoPosition {
  latitude: number;
  longitude: number;
}

export type GeoErrorReason = "denied" | "unavailable" | "timeout";

export class GeoError extends Error {
  reason: GeoErrorReason;
  constructor(reason: GeoErrorReason, message: string) {
    super(message);
    this.reason = reason;
  }
}

export function getCurrentPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(
        new GeoError("unavailable", "이 브라우저에서는 위치 기능을 지원하지 않아요."),
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(
            new GeoError(
              "denied",
              "위치 권한이 꺼져 있어요. 주소를 검색해서 직접 지정할 수 있습니다.",
            ),
          );
        } else if (err.code === err.TIMEOUT) {
          reject(
            new GeoError(
              "timeout",
              "위치를 불러오지 못했어요. 주소를 검색해서 직접 지정할 수 있습니다.",
            ),
          );
        } else {
          reject(
            new GeoError(
              "unavailable",
              "위치를 확인하지 못했어요. 주소를 검색해서 직접 지정할 수 있습니다.",
            ),
          );
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 },
    );
  });
}
