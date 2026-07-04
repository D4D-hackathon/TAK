/**
 * Wargame 게임 규칙 상수 & 지오 헬퍼 (한 곳에서 조정)
 */

/** 한 턴 이동 반경(m). ⚠️ 이동 제한/원 반경은 이 상수 하나로 조정. */
export const MOVE_RADIUS_M = 7000; // 7km

/** 공격 사거리(m). ⚠️ 공격 사거리 판정은 이 상수 하나로 조정. */
export const ATTACK_RANGE_M = 5000; // 5km

const METERS_PER_DEG_LAT = 111320;

/** 위도 보정을 반영한 두 좌표 간 실제 거리(m) */
export function distanceMeters(
    lon1: number,
    lat1: number,
    lon2: number,
    lat2: number,
): number {
    const mPerLon = METERS_PER_DEG_LAT * Math.cos((lat1 * Math.PI) / 180);
    const dx = (lon2 - lon1) * mPerLon;
    const dy = (lat2 - lat1) * METERS_PER_DEG_LAT;
    return Math.hypot(dx, dy);
}
