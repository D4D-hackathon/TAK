<template>
    <div
        v-if='chat.reportOpen && report'
        class='wargame-report-backdrop position-absolute d-flex align-items-center justify-content-center'
        @click.self='chat.closeReport()'
    >
        <div class='wargame-report-card text-white d-flex flex-column'>
            <!-- 헤더 -->
            <div class='wargame-report-header d-flex align-items-center justify-content-between px-4 py-3'>
                <div>
                    <div
                        class='fw-bold'
                        style='font-size: 18px;'
                    >
                        게임 종료 리포트
                    </div>
                    <div
                        class='text-secondary'
                        style='font-size: 13px;'
                        v-text='report.title'
                    />
                </div>
                <div
                    role='button'
                    class='cloudtak-hover cursor-pointer d-flex'
                    title='닫기'
                    @click='chat.closeReport()'
                >
                    <IconX
                        :size='22'
                        stroke='1.5'
                    />
                </div>
            </div>

            <!-- 본문 -->
            <div class='wargame-report-body flex-grow-1 px-4 py-3'>
                <!-- 시나리오 -->
                <div class='mb-3'>
                    <div class='wargame-report-section-title'>시나리오</div>
                    <div>{{ report.title }} <span class='text-secondary'>({{ report.scenario }})</span></div>
                </div>

                <!-- 이번 턴 공격/수비 결정 -->
                <div class='mb-3'>
                    <div class='wargame-report-section-title'>이번 턴 결정</div>
                    <span
                        class='fw-bold'
                        :class='game.turnDecision === "attack" ? "text-danger" : "text-info"'
                        v-text='decisionLabel'
                    />
                </div>

                <!-- 유저 서술 (rationale) -->
                <div class='mb-3'>
                    <div class='wargame-report-section-title'>지휘관 서술</div>
                    <div
                        v-if='game.playerRationale'
                        style='white-space: pre-wrap;'
                        v-text='game.playerRationale'
                    />
                    <div
                        v-else
                        class='text-secondary'
                    >
                        서술 없음
                    </div>
                </div>

                <!-- 부대 최종 위치 -->
                <div class='mb-3'>
                    <div class='wargame-report-section-title'>부대 최종 위치 ({{ game.units.length }})</div>
                    <div
                        v-for='u in game.units'
                        :key='u.id'
                        class='wargame-timeline-row d-flex'
                    >
                        <span
                            class='flex-shrink-0'
                            :class='u.side === "RED" ? "text-danger" : "text-info"'
                            style='width: 130px;'
                            v-text='u.name'
                        />
                        <span
                            class='text-secondary'
                            style='font-variant-numeric: tabular-nums;'
                        >{{ u.lon.toFixed(4) }}, {{ u.lat.toFixed(4) }}</span>
                    </div>
                </div>

                <!-- 지정된 공격 -->
                <div class='mb-3'>
                    <div class='wargame-report-section-title'>지정된 공격 ({{ game.attacks.length }})</div>
                    <ul
                        v-if='game.attacks.length'
                        class='mb-0 ps-3'
                    >
                        <li
                            v-for='(a, i) in game.attacks'
                            :key='i'
                            class='mb-1'
                        >
                            {{ unitName(a.attacker_id) }} → {{ unitName(a.target_id) }}
                        </li>
                    </ul>
                    <div
                        v-else
                        class='text-secondary'
                    >
                        지정된 공격이 없습니다.
                    </div>
                </div>

                <!-- 유저 결정 -->
                <div class='mb-3'>
                    <div class='wargame-report-section-title'>내가 내린 결정 ({{ report.decisions.length }})</div>
                    <ol
                        v-if='report.decisions.length'
                        class='mb-0 ps-3'
                    >
                        <li
                            v-for='(d, i) in report.decisions'
                            :key='i'
                            class='mb-1'
                            v-text='d'
                        />
                    </ol>
                    <div
                        v-else
                        class='text-secondary'
                    >
                        기록된 결정이 없습니다.
                    </div>
                </div>

                <!-- 대화 타임라인 -->
                <div class='mb-3'>
                    <div class='wargame-report-section-title'>대화 타임라인 ({{ report.timeline.length }})</div>
                    <div
                        v-if='report.timeline.length'
                        class='wargame-timeline'
                    >
                        <div
                            v-for='(msg, i) in report.timeline'
                            :key='i'
                            class='wargame-timeline-row d-flex'
                        >
                            <span
                                class='wargame-timeline-role flex-shrink-0'
                                :class='msg.role === "user" ? "text-info" : "text-warning"'
                                v-text='msg.role === "user" ? "나" : "튜터"'
                            />
                            <span
                                class='wargame-timeline-time text-secondary flex-shrink-0'
                                v-text='formatTime(msg.timestamp)'
                            />
                            <span
                                class='wargame-timeline-content'
                                v-text='msg.content'
                            />
                        </div>
                    </div>
                    <div
                        v-else
                        class='text-secondary'
                    >
                        대화 기록이 없습니다.
                    </div>
                </div>

                <!-- 총평 (LLM placeholder) -->
                <div class='mb-1'>
                    <div class='wargame-report-section-title'>총평</div>
                    <div class='wargame-report-summary text-secondary fst-italic'>
                        {{ report.summary }}
                    </div>
                </div>

                <!-- 엔진 판정 (ai-agent) -->
                <div class='mb-3'>
                    <div class='wargame-report-section-title'>전투 판정 (엔진)</div>

                    <div
                        v-if='resolving'
                        class='text-info'
                    >
                        ⏳ 판정 중… (지형 실측 + 교범 검색)
                    </div>
                    <div
                        v-else-if='resolveError'
                        class='text-danger'
                    >
                        판정 실패: {{ resolveError }}
                    </div>
                    <div v-else-if='engine && engine.ok && situation && combat'>
                        <div class='wargame-row'>
                            <span class='wargame-label'>전력비 (effective)</span>
                            <span>{{ situation.effective_ratio }}</span>
                        </div>
                        <div class='wargame-row'>
                            <span class='wargame-label'>공격 성공 확률</span>
                            <span>{{ (situation.p_attacker_success * 100).toFixed(1) }}%</span>
                        </div>
                        <div class='wargame-row'>
                            <span class='wargame-label'>지형 / 협로</span>
                            <span>{{ situation.terrain }} / {{ situation.chokepoint ? '있음' : '없음' }}</span>
                        </div>
                        <div class='wargame-row'>
                            <span class='wargame-label'>판정 결과</span>
                            <span class='fw-bold text-warning'>{{ combat.outcome }}</span>
                        </div>
                        <div
                            v-if='losses'
                            class='wargame-row'
                        >
                            <span class='wargame-label'>손실 (아/적 전차)</span>
                            <span>{{ losses.friendly.tanks }} / {{ losses.enemy.tanks }}</span>
                        </div>
                        <div
                            v-if='enemyAction && enemyAction.suggested_action'
                            class='mt-2'
                        >
                            <span class='wargame-label d-block mb-1'>예상 적 행동</span>
                            <span v-text='enemyAction.suggested_action' />
                        </div>
                        <div
                            v-if='citations.length'
                            class='mt-2'
                        >
                            <span class='wargame-label d-block mb-1'>교범 근거</span>
                            <ul class='mb-0 ps-3'>
                                <li
                                    v-for='(c, i) in citations'
                                    :key='i'
                                    class='mb-1'
                                    style='font-size: 13px;'
                                >
                                    <span class='text-info'>{{ c.citation }}</span>
                                    <span class='text-secondary'> — {{ (c.snippet || '').slice(0, 90) }}…</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div
                        v-else-if='engine && !engine.ok'
                        class='text-warning'
                    >
                        입력 부족 (missing): {{ (engine.missing || []).join(', ') }}
                    </div>
                    <div
                        v-else
                        class='text-secondary fst-italic'
                    >
                        (판정 대기)
                    </div>
                </div>

                <!-- 조립된 payload (확인용) -->
                <div
                    v-if='payloadJson'
                    class='mb-1'
                >
                    <div class='wargame-report-section-title'>조립된 payload (확인용)</div>
                    <pre class='wargame-payload'>{{ payloadJson }}</pre>
                </div>
            </div>

            <!-- 푸터 -->
            <div class='wargame-report-footer d-flex justify-content-end px-4 py-2'>
                <button
                    type='button'
                    class='btn btn-secondary btn-sm'
                    @click='chat.closeReport()'
                >
                    닫기
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang='ts'>
import { computed } from 'vue';
import { IconX } from '@tabler/icons-vue';
import { useWargameChatStore } from '../../stores/wargameChat.ts';
import { useWargameStore } from '../../stores/wargame.ts';

const chat = useWargameChatStore();
const game = useWargameStore();
const report = computed(() => chat.report);

const decisionLabel = computed(() => (game.turnDecision === 'attack' ? '공격' : '수비'));

function unitName(id: string): string {
    return game.units.find((u) => u.id === id)?.name ?? id;
}

const payloadJson = computed(() =>
    game.lastPayload ? JSON.stringify(game.lastPayload, null, 2) : '',
);

// 백엔드 엔진 판정 결과
const engine = computed(() => game.engineResult?.engine_result ?? null);
const resolving = computed(() => game.resolving);
const resolveError = computed(() => game.resolveError);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const situation = computed<any>(() => engine.value?.situation ?? null);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const combat = computed<any>(() => engine.value?.resolution?.result ?? null);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const losses = computed<any>(() => combat.value?.losses ?? null);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const enemyAction = computed<any>(() => engine.value?.enemy_action ?? null);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const citations = computed<any[]>(() => enemyAction.value?.doctrine_basis ?? []);

function formatTime(ts: number): string {
    try {
        return new Date(ts).toLocaleTimeString('ko-KR', { hour12: false });
    } catch {
        return '';
    }
}
</script>

<style scoped>
.wargame-report-backdrop {
    inset: 0;
    z-index: 20;
    background-color: rgba(0, 0, 0, 0.6);
}
.wargame-report-card {
    width: 640px;
    max-width: calc(100vw - 40px);
    max-height: calc(100vh - 80px);
    background-color: rgba(20, 20, 20, 0.98);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 10px;
    overflow: hidden;
}
.wargame-report-header {
    background-color: rgba(255, 255, 255, 0.06);
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}
.wargame-report-body {
    overflow-y: auto;
    min-height: 0;
    font-size: 14px;
}
.wargame-report-section-title {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 4px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 2px;
}
.wargame-timeline-row {
    padding: 3px 0;
    gap: 8px;
    align-items: baseline;
}
.wargame-timeline-role {
    width: 34px;
    font-size: 12px;
    font-weight: 600;
}
.wargame-timeline-time {
    width: 72px;
    font-size: 11px;
    font-variant-numeric: tabular-nums;
}
.wargame-timeline-content {
    flex: 1;
    white-space: pre-wrap;
    word-break: break-word;
}
.wargame-report-footer {
    border-top: 1px solid rgba(255, 255, 255, 0.12);
}
.wargame-payload {
    background-color: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 10px;
    font-size: 12px;
    color: #d7e3ff;
    max-height: 240px;
    overflow: auto;
    white-space: pre;
    margin: 0;
}
</style>
