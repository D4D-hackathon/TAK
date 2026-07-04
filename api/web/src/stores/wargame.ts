/**
 * Wargame Unit Store (프론트 state 전용)
 *
 * 철원 전차대대(units-cheorwon 오버레이)의 선택/이동 상태를 브라우저 메모리에만
 * 보관한다. DB/백엔드 저장 없음 — 새로고침 시 오버레이 원본(정적 GeoJSON)으로 되돌아간다.
 * 위치 이동은 여기 units[].lon/lat 에만 반영되고, 지도에는 오버레이 소스 setData 로 그려진다.
 */
import { defineStore } from 'pinia';
import { ATTACK_RANGE_M, distanceMeters } from '../base/wargameConfig.ts';

export type WargameUnit = {
    id: string;
    name: string;
    side: 'BLUE' | 'RED' | string;
    type: string;
    strength: number;
    posture: string;
    sidc: string;
    note: string;
    icon: string;
    callsign: string;
    lon: number;
    lat: number;
    // 이번 턴의 이동 기준점(턴 시작 위치). 이동 가능 원의 중심 + 드래그 거리 clamp 기준.
    anchorLon: number;
    anchorLat: number;
};

// units-cheorwon 오버레이 식별 (base/overlay.ts loadedByMode)
export const WARGAME_OVERLAY_MODE = 'demo';
export const WARGAME_OVERLAY_MODE_ID = 'units-cheorwon';

export type TurnDecision = 'attack' | 'defense';

export type Attack = { attacker_id: string; target_id: string };

/** 선택된 적(RED)을 현재 공격자(BLUE)가 칠 수 있는지의 맥락 */
export type AttackContext = {
    attacker: WargameUnit;
    target: WargameUnit;
    distance: number;
    inRange: boolean;
    designated: boolean;
};

export const useWargameStore = defineStore('wargame', {
    state: () => ({
        units: [] as WargameUnit[],
        selectedUnitId: null as string | null,
        loaded: false,
        // ---- 게임 규칙 state (프론트 전용) ----
        turnDecision: 'defense' as TurnDecision, // 이번 턴 공격/수비 (기록만)
        attackerId: null as string | null,       // 마지막으로 선택한 아군(공격 주체)
        attacks: [] as Attack[],                  // 유저가 지정한 공격들
        playerRationale: '' as string,            // 턴 종료 후 유저 서술
        awaitingRationale: false,                 // 턴 종료 → 서술 대기 중
        // 턴 종료 시점에 얼린 스냅샷(부대 위치/공격/결정). 전송 때 이걸 보낸다(실시간 값 아님).
        savedSnapshot: null as null | { units: WargameUnit[]; attacks: Attack[]; decision: TurnDecision },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lastPayload: null as any,                 // 조립된 에이전트 payload (확인용)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        engineResult: null as any,                // 백엔드 엔진 판정 결과
        resolving: false,                         // 판정 요청 중
        resolveError: null as string | null,      // 판정 실패 메시지
    }),

    getters: {
        selectedUnit(state): WargameUnit | null {
            if (!state.selectedUnitId) return null;
            return state.units.find((u) => u.id === state.selectedUnitId) ?? null;
        },

        attackerUnit(state): WargameUnit | null {
            if (!state.attackerId) return null;
            return state.units.find((u) => u.id === state.attackerId) ?? null;
        },

        /** 선택된 부대가 적(RED)이고, 현재 공격자(BLUE)가 있으면 사거리 판정 맥락 반환 */
        attackContext(): AttackContext | null {
            const target = this.selectedUnit;
            if (!target || target.side !== 'RED') return null;
            const attacker = this.attackerUnit;
            if (!attacker || attacker.side !== 'BLUE') return null;
            const d = distanceMeters(attacker.lon, attacker.lat, target.lon, target.lat);
            const designated = this.attacks.some(
                (a) => a.attacker_id === attacker.id && a.target_id === target.id,
            );
            return { attacker, target, distance: d, inRange: d <= ATTACK_RANGE_M, designated };
        },
    },

    actions: {
        /** 오버레이 GeoJSON(FeatureCollection)에서 부대 state 초기화 */
        loadFromGeoJSON(fc: GeoJSON.FeatureCollection): void {
            const units: WargameUnit[] = [];
            for (const f of fc.features) {
                const p = (f.properties ?? {}) as Record<string, unknown>;
                if (!p.wargame_unit) continue;
                const geom = f.geometry;
                if (!geom || geom.type !== 'Point') continue;
                const [lon, lat] = geom.coordinates as [number, number];
                units.push({
                    id: String(p.id),
                    name: String(p.name ?? ''),
                    side: String(p.side ?? ''),
                    type: String(p.type ?? ''),
                    strength: Number(p.strength ?? 0),
                    posture: String(p.posture ?? ''),
                    sidc: String(p.sidc ?? ''),
                    note: String(p.note ?? ''),
                    icon: String(p.icon ?? ''),
                    callsign: String(p.callsign ?? p.name ?? ''),
                    lon,
                    lat,
                    anchorLon: lon,
                    anchorLat: lat,
                });
            }
            this.units = units;
            this.loaded = units.length > 0;
        },

        selectUnit(id: string): void {
            this.selectedUnitId = id;
            // 아군 선택 시 그 부대가 공격 주체가 된다. 적 선택은 공격자를 바꾸지 않는다
            // (아군 선택 → 사거리 내 적 클릭 → 공격 지정 흐름을 위해).
            const u = this.units.find((unit) => unit.id === id);
            if (u && u.side === 'BLUE') this.attackerId = id;
        },

        clearSelection(): void {
            this.selectedUnitId = null;
            this.attackerId = null;
        },

        // ---- 게임 규칙 액션 ----
        setDecision(decision: TurnDecision): void {
            this.turnDecision = decision;
        },

        /** 공격 지정 (같은 공격자의 기존 지정은 갱신) */
        addAttack(attackerId: string, targetId: string): void {
            this.attacks = this.attacks.filter((a) => a.attacker_id !== attackerId);
            this.attacks.push({ attacker_id: attackerId, target_id: targetId });
        },

        removeAttack(attackerId: string): void {
            this.attacks = this.attacks.filter((a) => a.attacker_id !== attackerId);
        },

        setRationale(text: string): void {
            this.playerRationale = text;
        },

        /** 턴 종료 시점의 부대 위치/공격/결정을 얼린다(깊은 복사). 전송은 이 스냅샷을 사용. */
        saveSnapshot(): void {
            this.savedSnapshot = {
                units: this.units.map((u) => ({ ...u })),
                attacks: this.attacks.map((a) => ({ ...a })),
                decision: this.turnDecision,
            };
        },

        setAwaitingRationale(v: boolean): void {
            this.awaitingRationale = v;
        },

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setLastPayload(payload: any): void {
            this.lastPayload = payload;
        },

        setResolving(v: boolean): void {
            this.resolving = v;
        },

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setEngineResult(result: any): void {
            this.engineResult = result;
            this.resolveError = null;
        },

        setResolveError(msg: string | null): void {
            this.resolveError = msg;
        },

        /** 프론트 state 상의 위치만 변경 (DB 저장 없음) */
        moveUnit(id: string, lon: number, lat: number): void {
            const u = this.units.find((unit) => unit.id === id);
            if (!u) return;
            u.lon = lon;
            u.lat = lat;
        },

        /** 턴 종료 시 각 부대의 이동 기준점을 현재 위치로 리셋 (새 턴 = 새 15km 예산) */
        resetAnchors(): void {
            for (const u of this.units) {
                u.anchorLon = u.lon;
                u.anchorLat = u.lat;
            }
        },

        /** 현재 state 를 오버레이 소스 setData 용 GeoJSON 으로 직렬화 */
        toGeoJSON(): GeoJSON.FeatureCollection {
            return {
                type: 'FeatureCollection',
                features: this.units.map((u) => ({
                    type: 'Feature',
                    properties: {
                        id: u.id,
                        wargame_unit: true,
                        icon: u.icon,
                        callsign: u.callsign,
                        name: u.name,
                        side: u.side,
                        type: u.type,
                        strength: u.strength,
                        posture: u.posture,
                        sidc: u.sidc,
                        note: u.note,
                    },
                    geometry: { type: 'Point', coordinates: [u.lon, u.lat] },
                })),
            };
        },
    },
});
