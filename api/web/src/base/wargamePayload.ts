/**
 * Wargame 에이전트 payload 조립 (프론트 state → 전송용 구조).
 *
 * ⚠️ 이번 단계는 "조립"까지다. 지형(elevation/terrain) 값은 백엔드 지형 API 호출이 필요하므로
 *    자리(필드)만 만들고 null 로 둔다.
 */
import type { WargameUnit, Attack, TurnDecision } from '../stores/wargame.ts';

export interface PayloadUnit {
    id: string;
    name: string;
    side: string;
    type: string;
    strength: number;
    posture: string;            // 엔진 태세 집계에 사용 (defensive/offensive/reserve)
    position: [number, number]; // [lon, lat]
    elevation_m: number | null; // TODO: 백엔드 /terrain/elevation 으로 채움
}

export interface PayloadAttack {
    attacker_id: string;
    target_id: string;
    terrain: unknown | null; // TODO: 백엔드 /terrain/engagement 로 채움
}

export interface AgentPayload {
    scenario: string;
    player_decision: TurnDecision;
    player_rationale: string;
    units: PayloadUnit[];
    attacks: PayloadAttack[];
}

export interface BuildPayloadInput {
    decision: TurnDecision;
    rationale: string;
    units: WargameUnit[];
    attacks: Attack[];
}

/**
 * 현재 게임 state 로 에이전트 전송용 payload 를 조립한다.
 *
 * // TODO: units 의 elevation_m, attacks 의 terrain 을 백엔드 지형 API 로 채운다.
 * //       - elevation_m: POST /terrain/elevation
 * //       - terrain:     POST /terrain/engagement (attacker vs target)
 * //       채운 뒤 완성 payload 를 에이전트 엔드포인트로 전송한다. (이번 단계 범위 밖)
 */
export function buildAgentPayload(input: BuildPayloadInput): AgentPayload {
    return {
        scenario: 'cheorwon-defense-demo',
        player_decision: input.decision,
        player_rationale: input.rationale,
        units: input.units.map((u) => ({
            id: u.id,
            name: u.name,
            side: u.side,
            type: u.type,
            strength: u.strength,
            posture: u.posture,
            position: [u.lon, u.lat],
            elevation_m: null, // TODO: 지형 API 로 채움
        })),
        attacks: input.attacks.map((a) => ({
            attacker_id: a.attacker_id,
            target_id: a.target_id,
            terrain: null, // TODO: /terrain/engagement 로 채움
        })),
    };
}
