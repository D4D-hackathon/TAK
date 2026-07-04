/**
 * Wargame 지도 인터랙션 배선 (프론트 state 전용)
 *
 * - 부대 오버레이(units-cheorwon)의 GeoJSON 소스를 재사용해 밀심볼 렌더는 그대로 두고,
 *   드래그로 위치를 옮기면 store state → 오버레이 소스 setData 로만 반영한다 (DB 저장 없음).
 * - 아군(BLUE)만 드래그 가능. 적군(RED)은 선택/정보 표시는 되지만 이동 불가.
 * - 선택 하이라이트는 이 모듈이 소유하는 별도 소스/레이어(wargame-selection)로 그린다.
 *
 * 클릭 선택(선택 상태 세팅)은 map.ts 전역 click 핸들러에서 wargame_unit 속성으로 가로채
 * useWargameStore().selectUnit() 을 호출한다 (여기서는 드래그/하이라이트만 담당).
 */
import type { Map as MapLibreMap, GeoJSONSource, MapMouseEvent } from 'maplibre-gl';
import OverlayManager from './overlay.ts';
import { MOVE_RADIUS_M, ATTACK_RANGE_M, distanceMeters } from './wargameConfig.ts';
import {
    useWargameStore,
    WARGAME_OVERLAY_MODE,
    WARGAME_OVERLAY_MODE_ID,
} from '../stores/wargame.ts';

const SELECTION_SOURCE = 'wargame-selection';
const SELECTION_LAYER = 'wargame-selection-ring';

const RANGE_SOURCE = 'wargame-range';
const RANGE_FILL = 'wargame-range-fill';
const RANGE_LINE = 'wargame-range-line';

const ATK_SOURCE = 'wargame-attack-range';
const ATK_FILL = 'wargame-attack-range-fill';
const ATK_LINE = 'wargame-attack-range-line';

const METERS_PER_DEG_LAT = 111320;

/** anchor 기준 MOVE_RADIUS_M 를 넘으면 anchor→목표 방향 경계로 clamp한 [lon,lat] 반환 */
function clampToRange(
    anchorLon: number,
    anchorLat: number,
    lon: number,
    lat: number,
): [number, number] {
    const d = distanceMeters(anchorLon, anchorLat, lon, lat);
    if (d <= MOVE_RADIUS_M || d === 0) return [lon, lat];
    const s = MOVE_RADIUS_M / d;
    return [anchorLon + (lon - anchorLon) * s, anchorLat + (lat - anchorLat) * s];
}

/** 중심에서 반경(m) 원을 미터 기반(위도 보정)으로 근사한 폴리곤. 단순 도 반경(타원) 방지. */
function circlePolygon(
    centerLon: number,
    centerLat: number,
    radiusM: number,
    steps = 72,
): GeoJSON.Feature<GeoJSON.Polygon> {
    const mPerLon = METERS_PER_DEG_LAT * Math.cos((centerLat * Math.PI) / 180);
    const ring: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * 2 * Math.PI;
        const dLon = (radiusM * Math.cos(a)) / mPerLon;
        const dLat = (radiusM * Math.sin(a)) / METERS_PER_DEG_LAT;
        ring.push([centerLon + dLon, centerLat + dLat]);
    }
    return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } };
}

const attached = new WeakSet<MapLibreMap>();

/** 부대 오버레이의 GeoJSON 소스 id (문자열) 또는 null */
function unitsSourceId(): string | null {
    const overlay = OverlayManager.loadedByMode(WARGAME_OVERLAY_MODE, WARGAME_OVERLAY_MODE_ID);
    return overlay ? String(overlay.id) : null;
}

function getUnitsSource(map: MapLibreMap): GeoJSONSource | null {
    const id = unitsSourceId();
    if (!id) return null;
    const src = map.getSource(id);
    if (!src || src.type !== 'geojson') return null;
    return src as GeoJSONSource;
}

/** 오버레이가 로드되면 그 데이터로 store 를 초기화 (한 번만) */
async function ensureLoaded(map: MapLibreMap): Promise<boolean> {
    const store = useWargameStore();
    if (store.loaded) return true;
    const src = getUnitsSource(map);
    if (!src) return false;
    try {
        const data = await src.getData();
        store.loadFromGeoJSON(data as GeoJSON.FeatureCollection);
        return store.loaded;
    } catch {
        return false;
    }
}

/** store state → 오버레이 소스로 반영 (드래그 이동 시) */
function pushToMap(map: MapLibreMap): void {
    const src = getUnitsSource(map);
    if (!src) return;
    const store = useWargameStore();
    // store 가 아직 초기화 전이면 소스를 비우지 않도록 방어 (부대 사라짐 방지)
    if (!store.units.length) return;
    src.setData(store.toGeoJSON());
}

/** 선택 하이라이트 소스/레이어 보장 */
function ensureHighlightLayer(map: MapLibreMap): void {
    if (!map.getSource(SELECTION_SOURCE)) {
        map.addSource(SELECTION_SOURCE, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
        });
    }
    if (!map.getLayer(SELECTION_LAYER)) {
        map.addLayer({
            id: SELECTION_LAYER,
            type: 'circle',
            source: SELECTION_SOURCE,
            paint: {
                'circle-radius': 20,
                'circle-color': 'rgba(0,0,0,0)',
                'circle-stroke-width': 3,
                'circle-stroke-color': '#ffd43b',
                'circle-stroke-opacity': 0.95,
            },
        });
    }
}

/** 선택 상태 → 하이라이트 링 위치 갱신 */
function updateHighlight(map: MapLibreMap): void {
    const src = map.getSource(SELECTION_SOURCE) as GeoJSONSource | undefined;
    if (!src) return;
    const store = useWargameStore();
    const u = store.selectedUnit;
    if (!u) {
        src.setData({ type: 'FeatureCollection', features: [] });
        return;
    }
    src.setData({
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            properties: {},
            geometry: { type: 'Point', coordinates: [u.lon, u.lat] },
        }],
    });
}

/** 부대 소스에 속한 첫 레이어 id (원을 그 아래에 두어 심볼을 가리지 않기 위함) */
function firstUnitsLayerId(map: MapLibreMap): string | undefined {
    const sid = unitsSourceId();
    if (!sid) return undefined;
    const layers = map.getStyle().layers ?? [];
    const found = layers.find((ly) => (ly as { source?: string }).source === sid);
    return found?.id;
}

/** 이동 가능 범위 원 소스/레이어 보장 (부대 심볼 아래에 배치) */
function ensureRangeLayer(map: MapLibreMap): void {
    if (!map.getSource(RANGE_SOURCE)) {
        map.addSource(RANGE_SOURCE, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
        });
    }
    const before = firstUnitsLayerId(map);
    if (!map.getLayer(RANGE_FILL)) {
        map.addLayer({
            id: RANGE_FILL,
            type: 'fill',
            source: RANGE_SOURCE,
            paint: { 'fill-color': '#4dabf7', 'fill-opacity': 0.12 },
        }, before);
    }
    if (!map.getLayer(RANGE_LINE)) {
        map.addLayer({
            id: RANGE_LINE,
            type: 'line',
            source: RANGE_SOURCE,
            paint: { 'line-color': '#4dabf7', 'line-width': 2, 'line-opacity': 0.7 },
        }, before);
    }
}

/** 선택된 아군의 이동 가능 원(7km) 갱신. 공격 모드에선 숨긴다(공격 사거리 원만 표시). */
function updateRange(map: MapLibreMap): void {
    const src = map.getSource(RANGE_SOURCE) as GeoJSONSource | undefined;
    if (!src) return;
    const store = useWargameStore();
    const u = store.selectedUnit;
    if (!u || u.side !== 'BLUE' || store.attackModeUnitId) {
        src.setData({ type: 'FeatureCollection', features: [] });
        return;
    }
    src.setData({
        type: 'FeatureCollection',
        features: [circlePolygon(u.anchorLon, u.anchorLat, MOVE_RADIUS_M)],
    });
}

/** 공격 사거리 원(5km) 소스/레이어 보장 (주황색, 부대 심볼 아래) */
function ensureAttackRangeLayer(map: MapLibreMap): void {
    if (!map.getSource(ATK_SOURCE)) {
        map.addSource(ATK_SOURCE, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
        });
    }
    const before = firstUnitsLayerId(map);
    if (!map.getLayer(ATK_FILL)) {
        map.addLayer({
            id: ATK_FILL,
            type: 'fill',
            source: ATK_SOURCE,
            paint: { 'fill-color': '#ff922b', 'fill-opacity': 0.14 },
        }, before);
    }
    if (!map.getLayer(ATK_LINE)) {
        map.addLayer({
            id: ATK_LINE,
            type: 'line',
            source: ATK_SOURCE,
            paint: { 'line-color': '#f76707', 'line-width': 2, 'line-opacity': 0.85 },
        }, before);
    }
}

/** 공격 모드 아군의 현재 위치 기준 공격 사거리 원 갱신 (모드 아니면 숨김) */
function updateAttackRange(map: MapLibreMap): void {
    const src = map.getSource(ATK_SOURCE) as GeoJSONSource | undefined;
    if (!src) return;
    const store = useWargameStore();
    const u = store.attackModeUnit;
    if (!u) {
        src.setData({ type: 'FeatureCollection', features: [] });
        return;
    }
    src.setData({
        type: 'FeatureCollection',
        features: [circlePolygon(u.lon, u.lat, ATTACK_RANGE_M)],
    });
}

/**
 * 지도에 워게임 인터랙션을 1회 부착. map.ts 의 이벤트 등록부에서 호출.
 */
export function attachWargameInteractions(map: MapLibreMap): void {
    if (attached.has(map)) return;
    attached.add(map);

    const store = useWargameStore();

    // 오버레이 로드까지 폴링하여 store 초기화 + 하이라이트 레이어/구독 세팅
    const poll = setInterval(() => {
        void ensureLoaded(map).then((ok) => {
            if (!ok) return;
            clearInterval(poll);
            ensureHighlightLayer(map);
            ensureRangeLayer(map);
            ensureAttackRangeLayer(map);
            updateHighlight(map);
            updateRange(map);
            updateAttackRange(map);
            // 선택/이동/앵커/공격모드 등 state 변경 시 하이라이트 + 이동원 + 공격사거리원 갱신
            store.$subscribe(() => {
                updateHighlight(map);
                updateRange(map);
                updateAttackRange(map);
            });
        });
    }, 500);
    // 8초 후 폴링 포기 (오버레이 미로드 시 무한루프 방지)
    setTimeout(() => clearInterval(poll), 8000);

    // ---- 드래그 (아군 BLUE 만) --------------------------------------------
    let dragId: string | null = null;

    map.on('mousedown', (e: MapMouseEvent) => {
        if (!unitsSourceId()) return;
        // 턴 종료 후 서술 대기 중이면 이동을 잠근다(위치는 이미 스냅샷으로 얼려짐).
        if (store.awaitingRationale) return;
        const feats = map.queryRenderedFeatures(e.point).filter(
            (f) => f.properties && f.properties.wargame_unit,
        );
        if (!feats.length) return;
        const f = feats[0];
        if (String(f.properties.side) !== 'BLUE') return; // 적군은 이동 불가

        // store 가 아직 로드 전이면 이번엔 드래그하지 않고 로드만 트리거 (데이터 유실 방지)
        if (!store.loaded) { void ensureLoaded(map); return; }

        e.preventDefault();            // 지도 팬/회전 방지
        dragId = String(f.properties.id);
        store.selectUnit(dragId);      // 드래그 시작 부대 선택
        map.dragPan.disable();
        map.getCanvas().style.cursor = 'grabbing';
    });

    map.on('mousemove', (e: MapMouseEvent) => {
        if (!dragId) return;
        const unit = store.units.find((u) => u.id === dragId);
        let lon = e.lngLat.lng;
        let lat = e.lngLat.lat;
        // anchor(턴 시작 위치) 기준 15km 초과 시 경계로 clamp → 원 밖으로 못 나감
        if (unit) {
            [lon, lat] = clampToRange(unit.anchorLon, unit.anchorLat, lon, lat);
        }
        store.moveUnit(dragId, lon, lat);
        pushToMap(map);
    });

    const endDrag = () => {
        if (!dragId) return;
        dragId = null;
        map.dragPan.enable();
        map.getCanvas().style.cursor = '';
    };
    map.on('mouseup', endDrag);
}
