/**
 * 부대 좌표 → 지형 종류 일괄 조회 (프론트 → backend /terrain/places).
 *
 * 무키 OSM(랜드커버) + 로컬 DEM(경사)으로 각 지점이 숲·강·능선·평야 등 '어떤 지형'인지
 * 판정한다. vite 가 /terrain 을 backend(8000) 로 프록시하므로 상대경로로 호출한다.
 */

export interface PlaceInfo {
    id: string;
    lon: number;
    lat: number;
    kind: string;                 // 숲 · 강 · 능선 · 평야 · 시가지 …
    elevation_m: number | null;   // 로컬 DEM 표고(남한 범위 밖이면 null)
    slope_deg: number | null;
    label: string;                // 표시용 요약 (예: "능선 · 266m")
}

export interface PlacePoint {
    id: string;
    lon: number;
    lat: number;
}

export async function fetchPlaces(points: PlacePoint[]): Promise<PlaceInfo[]> {
    if (!points.length) return [];
    const res = await fetch('/terrain/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points }),
    });
    if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
            const body = await res.json();
            if (body?.detail) detail = String(body.detail);
        } catch { /* ignore */ }
        throw new Error(detail);
    }
    const data = await res.json();
    return (data?.places ?? []) as PlaceInfo[];
}
