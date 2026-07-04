/**
 * 워게임 판정 브리지 호출 (프론트 → backend /wargame/resolve → ai-agent 엔진).
 *
 * vite 가 /wargame 를 backend(8000) 로 프록시하므로 상대경로로 호출한다
 * (같은 origin → cloudflared → vite → 8000). 실제 판정/교범 근거는 백엔드 엔진이 만든다.
 */
import type { AgentPayload } from './wargamePayload.ts';

// 백엔드 엔진 응답 (필요한 필드만 느슨하게 타입화)
export interface EngineResolveResponse {
    engine_scenario?: Record<string, unknown>;
    engine_result?: {
        ok: boolean;
        missing?: string[];
        situation?: Record<string, unknown>;
        resolution?: Record<string, unknown>;
        enemy_action?: Record<string, unknown>;
        [k: string]: unknown;
    };
}

export async function resolveTurn(payload: AgentPayload): Promise<EngineResolveResponse> {
    const res = await fetch('/wargame/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
            const body = await res.json();
            if (body?.detail) detail = String(body.detail);
        } catch { /* ignore */ }
        throw new Error(detail);
    }
    return res.json();
}
