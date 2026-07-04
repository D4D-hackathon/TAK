<template>
    <div
        v-if='chat.reportOpen'
        class='wargame-report-backdrop position-absolute d-flex align-items-center justify-content-center'
        @click.self='!showLoader && chat.closeReport()'
    >
        <div class='wargame-report-card text-white d-flex flex-column'>
            <!-- ============ 판정 중: 진행률 대기 화면 ============ -->
            <div
                v-if='showLoader'
                class='wg-loader flex-grow-1 d-flex flex-column align-items-center justify-content-center px-4'
            >
                <div class='wg-ring-wrap'>
                    <svg
                        class='wg-ring'
                        width='150'
                        height='150'
                        viewBox='0 0 150 150'
                    >
                        <circle
                            class='wg-ring-track'
                            cx='75'
                            cy='75'
                            r='66'
                        />
                        <circle
                            class='wg-ring-bar'
                            cx='75'
                            cy='75'
                            r='66'
                            transform='rotate(-90 75 75)'
                            :style='{ strokeDasharray: RING_C, strokeDashoffset: RING_C * (1 - progress / 100) }'
                        />
                    </svg>
                    <div class='wg-ring-label'>
                        <div class='wg-ring-pct'>
                            {{ Math.round(progress) }}<span>%</span>
                        </div>
                        <div class='wg-ring-sub'>
                            판정 중
                        </div>
                    </div>
                </div>

                <div class='wg-steps mt-4'>
                    <div
                        v-for='(s, i) in STEPS'
                        :key='i'
                        class='wg-step d-flex align-items-center'
                        :class='{ done: i < stepIndex, active: i === stepIndex }'
                    >
                        <span class='wg-step-dot d-inline-flex align-items-center justify-content-center'>
                            <IconCheck
                                v-if='i < stepIndex'
                                :size='13'
                                stroke='3'
                            />
                        </span>
                        <span v-text='s' />
                    </div>
                </div>

                <div
                    class='text-secondary mt-4 text-center'
                    style='font-size: 12px;'
                >
                    지형 실측(표고·위성) · 교범 RAG 검색 · 결정론 전투 판정을 수행합니다.
                </div>
            </div>

            <!-- ================= 리포트 ================= -->
            <template v-else>
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
                            v-text='report?.title'
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
                    <!-- 판정 실패 -->
                    <div
                        v-if='resolveError'
                        class='wg-verdict wg-tone-lose mb-3'
                    >
                        <div class='wg-verdict-label'>
                            판정 실패
                        </div>
                        <div class='wg-verdict-sub'>
                            {{ resolveError }}
                        </div>
                    </div>

                    <!-- 입력 부족 -->
                    <div
                        v-else-if='engine && !engine.ok'
                        class='wg-verdict wg-tone-draw mb-3'
                    >
                        <div class='wg-verdict-label'>
                            입력 부족
                        </div>
                        <div class='wg-verdict-sub'>
                            누락 항목: {{ (engine.missing || []).join(', ') }}
                        </div>
                    </div>

                    <!-- 판정 결과 히어로 -->
                    <template v-else-if='engine && engine.ok && combat'>
                        <div
                            class='wg-verdict mb-3'
                            :class='`wg-tone-${verdict.tone}`'
                        >
                            <div class='wg-verdict-eyebrow'>
                                전투 판정
                            </div>
                            <div class='wg-verdict-label'>
                                {{ verdict.label }}
                            </div>
                            <div class='wg-verdict-sub'>
                                {{ outcomeKo }}
                            </div>
                        </div>

                        <!-- 지표 타일 -->
                        <div class='wg-tiles mb-3'>
                            <div class='wg-tile'>
                                <div class='wg-tile-k'>
                                    전력비
                                </div>
                                <div class='wg-tile-v'>
                                    {{ fmt(situation?.effective_ratio) }}
                                </div>
                            </div>
                            <div class='wg-tile'>
                                <div class='wg-tile-k'>
                                    공격 성공확률
                                </div>
                                <div class='wg-tile-v'>
                                    {{ pct(situation?.p_attacker_success) }}
                                </div>
                            </div>
                            <div class='wg-tile'>
                                <div class='wg-tile-k'>
                                    지형 / 협로
                                </div>
                                <div class='wg-tile-v wg-tile-sm'>
                                    {{ situation?.terrain }} · {{ situation?.chokepoint ? '협로' : '개활' }}
                                </div>
                            </div>
                            <div class='wg-tile'>
                                <div class='wg-tile-k'>
                                    교전거리
                                </div>
                                <div class='wg-tile-v'>
                                    {{ fmt(situation?.distance_km) }}<span class='wg-unit'>km</span>
                                </div>
                            </div>
                        </div>

                        <!-- 손실 비교 -->
                        <div
                            v-if='losses'
                            class='mb-3'
                        >
                            <div class='wargame-report-section-title'>
                                손실
                            </div>
                            <div class='wg-loss'>
                                <div class='wg-loss-side'>
                                    <span class='text-info fw-bold'>아군</span>
                                    <span class='wg-loss-num'>전차 {{ losses.friendly.tanks }}</span>
                                    <span class='wg-loss-num'>병력 {{ losses.friendly.troops }}</span>
                                </div>
                                <div class='wg-loss-side'>
                                    <span class='text-danger fw-bold'>적</span>
                                    <span class='wg-loss-num'>전차 {{ losses.enemy.tanks }}</span>
                                    <span class='wg-loss-num'>병력 {{ losses.enemy.troops }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- 예상 적 행동 + 교범 근거 -->
                        <div
                            v-if='enemyAction && enemyAction.suggested_action'
                            class='mb-3'
                        >
                            <div class='wargame-report-section-title'>
                                예상 적 행동
                            </div>
                            <div class='mb-2'>
                                {{ enemyAction.suggested_action }}
                            </div>
                            <ul
                                v-if='citations.length'
                                class='wg-cites mb-0 ps-0'
                            >
                                <li
                                    v-for='(c, i) in citations'
                                    :key='i'
                                    class='wg-cite'
                                >
                                    <span class='wg-cite-tag'>{{ c.citation }}</span>
                                    <span class='text-secondary'>{{ (c.snippet || '').slice(0, 100) }}…</span>
                                </li>
                            </ul>
                        </div>
                    </template>

                    <!-- 이번 턴 결정 + 서술 -->
                    <div class='mb-3'>
                        <div class='wargame-report-section-title'>
                            이번 턴 결정 · 지휘관 서술
                        </div>
                        <span
                            class='fw-bold me-2'
                            :class='game.turnDecision === "attack" ? "text-danger" : "text-info"'
                            v-text='decisionLabel'
                        />
                        <div
                            v-if='game.playerRationale'
                            class='mt-1'
                            style='white-space: pre-wrap;'
                            v-text='game.playerRationale'
                        />
                        <span
                            v-else
                            class='text-secondary'
                        >서술 없음</span>
                    </div>

                    <!-- 부대 최종 위치 -->
                    <div class='mb-3'>
                        <div class='wargame-report-section-title d-flex align-items-center'>
                            <span>부대 최종 위치 ({{ game.units.length }})</span>
                            <span
                                v-if='placesLoading'
                                class='text-secondary ms-2'
                                style='font-size: 11px; text-transform: none; letter-spacing: 0;'
                            >지형 조회 중…</span>
                        </div>
                        <div
                            v-for='u in game.units'
                            :key='u.id'
                            class='wargame-timeline-row d-flex align-items-center'
                        >
                            <span
                                class='flex-shrink-0'
                                :class='u.side === "RED" ? "text-danger" : "text-info"'
                                style='width: 130px;'
                                v-text='u.name'
                            />
                            <span
                                class='text-secondary flex-shrink-0'
                                style='font-variant-numeric: tabular-nums; width: 150px;'
                            >{{ u.lon.toFixed(4) }}, {{ u.lat.toFixed(4) }}</span>
                            <span
                                v-if='placeOf(u.id)'
                                class='wg-place'
                            >
                                <span class='wg-place-kind'>{{ placeOf(u.id)?.kind }}</span>
                                <span
                                    v-if='placeOf(u.id)?.elevation_m != null'
                                    class='text-secondary'
                                >{{ placeOf(u.id)?.elevation_m }}m</span>
                            </span>
                            <span
                                v-else-if='placesLoading'
                                class='text-secondary'
                                style='font-size: 12px;'
                            >…</span>
                        </div>
                    </div>

                    <!-- 대화 타임라인 -->
                    <details class='mb-3 wg-details'>
                        <summary class='wargame-report-section-title'>
                            대화 타임라인 ({{ report?.timeline.length || 0 }})
                        </summary>
                        <div
                            v-if='report?.timeline.length'
                            class='wargame-timeline mt-2'
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
                            class='text-secondary mt-2'
                        >
                            대화 기록이 없습니다.
                        </div>
                    </details>

                    <!-- 총평 -->
                    <div class='mb-1'>
                        <div class='wargame-report-section-title'>
                            총평
                        </div>
                        <div class='wargame-report-summary'>
                            {{ summary }}
                        </div>
                    </div>
                </div>

                <!-- 푸터 -->
                <div class='wargame-report-footer d-flex justify-content-between align-items-center px-4 py-2'>
                    <button
                        type='button'
                        class='btn btn-primary btn-sm d-flex align-items-center'
                        @click='downloadMarkdown'
                    >
                        <IconDownload
                            :size='16'
                            stroke='1.8'
                            class='me-1'
                        />
                        마크다운 다운로드
                    </button>
                    <button
                        type='button'
                        class='btn btn-secondary btn-sm'
                        @click='chat.closeReport()'
                    >
                        닫기
                    </button>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup lang='ts'>
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { IconX, IconDownload, IconCheck } from '@tabler/icons-vue';
import { useWargameChatStore } from '../../stores/wargameChat.ts';
import { useWargameStore } from '../../stores/wargame.ts';
import { fetchPlaces, type PlaceInfo } from '../../base/wargamePlaces.ts';

const chat = useWargameChatStore();
const game = useWargameStore();
const report = computed(() => chat.report);

const decisionLabel = computed(() => (game.turnDecision === 'attack' ? '공격' : '수비'));

function unitName(id: string): string {
    return game.units.find((u) => u.id === id)?.name ?? id;
}

// ---- 부대 위치 → 지형 종류 (무키 OSM+DEM, backend /terrain/places) ----------
const places = ref<Record<string, PlaceInfo>>({});
const placesLoading = ref(false);
let lastPlacesSig = '';

function placeOf(id: string): PlaceInfo | null {
    return places.value[id] ?? null;
}

async function loadPlaces(): Promise<void> {
    const units = game.units;
    if (!units.length) return;
    // 좌표가 바뀌지 않았으면 재조회 생략(부대 위치 5자리 서명)
    const sig = units.map((u) => `${u.id}:${u.lon.toFixed(5)},${u.lat.toFixed(5)}`).join('|');
    if (sig === lastPlacesSig) return;
    lastPlacesSig = sig;
    placesLoading.value = true;
    try {
        const res = await fetchPlaces(units.map((u) => ({ id: u.id, lon: u.lon, lat: u.lat })));
        const map: Record<string, PlaceInfo> = {};
        for (const p of res) map[p.id] = p;
        places.value = map;
    } catch {
        lastPlacesSig = '';   // 실패 시 다음 열람에 재시도
    } finally {
        placesLoading.value = false;
    }
}

// ---- 백엔드 엔진 판정 결과 --------------------------------------------------
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

// ---- 판정 결과 → 플레이어(아군) 관점 승패 --------------------------------
const OUTCOME_KO: Record<string, string> = {
    attacker_decisive: '공격 측 결정적 우세',
    attacker_marginal: '공격 측 근소 우세',
    stalemate: '교착 (균형)',
    defender_marginal: '방어 측 근소 우세',
    defender_decisive: '방어 측 결정적 우세',
};
const outcomeKo = computed(() => OUTCOME_KO[combat.value?.outcome] ?? combat.value?.outcome ?? '');
const blueIsAttacker = computed(() => situation.value?.mode === 'blue_attack');

const verdict = computed<{ label: string; tone: 'win' | 'lose' | 'draw' }>(() => {
    const o: string | undefined = combat.value?.outcome;
    if (!o) return { label: '—', tone: 'draw' };
    if (o === 'stalemate') return { label: '교착', tone: 'draw' };
    const attackerWon = o.startsWith('attacker');
    const decisive = o.endsWith('decisive');
    const blueWon = attackerWon === blueIsAttacker.value;
    const mag = decisive ? '결정적 ' : '';
    return blueWon
        ? { label: `아군 ${mag}우세`, tone: 'win' }
        : { label: `아군 ${mag}열세`, tone: 'lose' };
});

// ---- 표시 헬퍼 -------------------------------------------------------------
function fmt(v: unknown): string {
    return typeof v === 'number' ? String(Math.round(v * 100) / 100) : '—';
}
function pct(v: unknown): string {
    return typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : '—';
}
function formatTime(ts: number): string {
    try {
        return new Date(ts).toLocaleTimeString('ko-KR', { hour12: false });
    } catch {
        return '';
    }
}

// ---- 총평 (엔진 판정 수치로 결정론 생성; LLM 없이) --------------------------
const summary = computed<string>(() => {
    // 엔진 결과가 없으면 실패/대기 사유를 그대로 안내
    if (resolveError.value) return `판정에 실패해 총평을 생성할 수 없습니다 (${resolveError.value}).`;
    if (engine.value && !engine.value.ok) {
        return `입력이 부족해 판정을 완료하지 못했습니다 — 누락: ${(engine.value.missing || []).join(', ')}.`;
    }
    const s = situation.value;
    const c = combat.value;
    if (!engine.value?.ok || !s || !c) return report.value?.summary ?? '';

    const dec = game.turnDecision === 'attack' ? '공격' : '수비';
    const choke = s.chokepoint ? '협로' : '개활';
    const parts: string[] = [];
    parts.push(`이번 턴 아군은 ${dec}을(를) 선택했다.`);
    parts.push(
        `유효 전력비 ${fmt(s.effective_ratio)}:1, 공격 성공확률 ${pct(s.p_attacker_success)} 조건에서 `
        + `${s.terrain}(${choke})·교전거리 ${fmt(s.distance_km)}km 지형을 반영해 `
        + `「${outcomeKo.value}」로 판정됐다(${verdict.value.label}).`,
    );
    const L = losses.value;
    if (L) {
        const fw = L.friendly.tanks * 10 + L.friendly.troops;
        const ew = L.enemy.tanks * 10 + L.enemy.troops;
        const heavier = fw === ew ? '양측이 비슷한' : `${fw > ew ? '아군' : '적'} 피해가 더 큰`;
        parts.push(
            `손실은 아군 전차 ${L.friendly.tanks}·병력 ${L.friendly.troops}, `
            + `적 전차 ${L.enemy.tanks}·병력 ${L.enemy.troops}로 ${heavier} 교전이었다.`,
        );
    }
    if (enemyAction.value?.suggested_action) {
        parts.push(`적은 「${enemyAction.value.suggested_action}」(으)로 대응할 것으로 판단된다.`);
    }
    if (verdict.value.tone === 'win') {
        parts.push('현 기조가 유효하다 — 확보한 우세를 유지하며 예비대로 전과를 확대하는 것이 유리하다.');
    } else if (verdict.value.tone === 'lose') {
        parts.push('전력·지형이 불리하다 — 정면 소모를 피하고 화력 집중·기동 우회로 국지적 우세를 만든 뒤 교전하는 재검토가 필요하다.');
    } else {
        parts.push('전선이 교착됐다 — 결정적 우세를 위해 화력 지원·예비대 투입 또는 지형 이점 확보가 요구된다.');
    }
    return parts.join(' ');
});

// ---- 진행률 대기 화면 (판정 중) --------------------------------------------
const RING_C = 2 * Math.PI * 66; // 원 둘레
const STEPS = ['상황 정규화', '지형 실측 (표고·위성)', '교범 RAG 검색', '전투 판정 계산', '리포트 작성'];
const progress = ref(0);
const stepIndex = ref(0);
const loaderVisible = ref(false);
const showLoader = computed(() => loaderVisible.value);
let timer: ReturnType<typeof setInterval> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimers(): void {
    if (timer) { clearInterval(timer); timer = null; }
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
}

function startLoader(): void {
    clearTimers();
    loaderVisible.value = true;
    progress.value = 0;
    stepIndex.value = 0;
    // 백엔드는 스트리밍이 없으므로 90% 까지 감속 이징으로 채우고, 완료 시 100% 로 마감.
    timer = setInterval(() => {
        progress.value = Math.min(90, progress.value + Math.max(0.5, (90 - progress.value) * 0.07));
        stepIndex.value = Math.min(STEPS.length - 1, Math.floor(progress.value / (90 / STEPS.length)));
    }, 180);
}

function finishLoader(): void {
    if (timer) { clearInterval(timer); timer = null; }
    // 실패/입력부족은 즉시 리포트(에러 배너)로 전환
    if (game.resolveError) { loaderVisible.value = false; return; }
    progress.value = 100;
    stepIndex.value = STEPS.length;
    hideTimer = setTimeout(() => { loaderVisible.value = false; }, 650);
}

watch(resolving, (now) => {
    if (now) startLoader();
    else finishLoader();
}, { immediate: true });

// 리포트가 화면에 보이면(로딩 종료 + 열림) 부대 위치 지형을 조회한다.
const reportVisible = computed(() => chat.reportOpen && !showLoader.value);
watch(reportVisible, (visible) => {
    if (visible) void loadPlaces();
}, { immediate: true });

onBeforeUnmount(clearTimers);

// ---- 마크다운 다운로드 -----------------------------------------------------
function buildMarkdown(): string {
    const L: string[] = [];
    const now = new Date();
    const stamp = now.toLocaleString('ko-KR', { hour12: false });
    L.push(`# 게임 종료 리포트 — ${report.value?.title ?? ''}`);
    L.push('');
    L.push(`- **시나리오**: ${report.value?.scenario ?? ''}`);
    L.push(`- **생성 시각**: ${stamp}`);
    L.push(`- **이번 턴 결정**: ${decisionLabel.value}`);
    L.push('');

    if (engine.value?.ok && combat.value) {
        L.push('## 전투 판정 (엔진)');
        L.push('');
        L.push(`- **판정**: ${verdict.value.label} (${outcomeKo.value})`);
        if (situation.value) {
            L.push(`- **전력비 (effective)**: ${fmt(situation.value.effective_ratio)}`);
            L.push(`- **공격 성공 확률**: ${pct(situation.value.p_attacker_success)}`);
            L.push(`- **지형 / 협로**: ${situation.value.terrain} / ${situation.value.chokepoint ? '협로' : '개활'}`);
            L.push(`- **교전 거리**: ${fmt(situation.value.distance_km)} km`);
        }
        if (losses.value) {
            L.push(`- **손실 (전차/병력)**: 아군 ${losses.value.friendly.tanks}/${losses.value.friendly.troops}, 적 ${losses.value.enemy.tanks}/${losses.value.enemy.troops}`);
        }
        L.push('');
        if (enemyAction.value?.suggested_action) {
            L.push('### 예상 적 행동');
            L.push('');
            L.push(enemyAction.value.suggested_action);
            L.push('');
            if (citations.value.length) {
                L.push('**교범 근거**');
                L.push('');
                for (const c of citations.value) {
                    L.push(`- \`${c.citation}\` — ${(c.snippet || '').slice(0, 140)}…`);
                }
                L.push('');
            }
        }
    } else if (engine.value && !engine.value.ok) {
        L.push('## 전투 판정 (엔진)');
        L.push('');
        L.push(`> 입력 부족 — 누락: ${(engine.value.missing || []).join(', ')}`);
        L.push('');
    } else if (resolveError.value) {
        L.push('## 전투 판정 (엔진)');
        L.push('');
        L.push(`> 판정 실패: ${resolveError.value}`);
        L.push('');
    }

    L.push('## 지휘관 서술');
    L.push('');
    L.push(game.playerRationale || '_서술 없음_');
    L.push('');

    L.push(`## 부대 최종 위치 (${game.units.length})`);
    L.push('');
    L.push('| 부대 | 진영 | 경도 | 위도 | 지형 | 표고 |');
    L.push('|---|---|---|---|---|---|');
    for (const u of game.units) {
        const pl = places.value[u.id];
        const kind = pl?.kind ?? '-';
        const elev = pl?.elevation_m != null ? `${pl.elevation_m}m` : '-';
        L.push(`| ${u.name} | ${u.side} | ${u.lon.toFixed(4)} | ${u.lat.toFixed(4)} | ${kind} | ${elev} |`);
    }
    L.push('');

    if (game.attacks.length) {
        L.push(`## 지정된 공격 (${game.attacks.length})`);
        L.push('');
        for (const a of game.attacks) {
            L.push(`- ${unitName(a.attacker_id)} → ${unitName(a.target_id)}`);
        }
        L.push('');
    }

    if (report.value?.decisions.length) {
        L.push(`## 내가 내린 결정 (${report.value.decisions.length})`);
        L.push('');
        report.value.decisions.forEach((d, i) => L.push(`${i + 1}. ${d}`));
        L.push('');
    }

    if (report.value?.timeline.length) {
        L.push('## 대화 타임라인');
        L.push('');
        for (const m of report.value.timeline) {
            L.push(`- \`${formatTime(m.timestamp)}\` **${m.role === 'user' ? '나' : '튜터'}**: ${m.content}`);
        }
        L.push('');
    }

    L.push('## 총평');
    L.push('');
    L.push(summary.value);
    L.push('');

    return L.join('\n');
}

function downloadMarkdown(): void {
    const md = buildMarkdown();
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    const name = `wargame-report-${report.value?.scenario ?? 'report'}-`
        + `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.md`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
</script>

<style scoped>
.wargame-report-backdrop {
    inset: 0;
    z-index: 20;
    background-color: rgba(0, 0, 0, 0.6);
}
.wargame-report-card {
    width: 680px;
    max-width: calc(100vw - 40px);
    max-height: calc(100vh - 80px);
    min-height: 360px;
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
.wg-place {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
}
.wg-place-kind {
    background: rgba(120, 200, 120, 0.16);
    color: #8fd694;
    border-radius: 4px;
    padding: 1px 7px;
    font-weight: 600;
}
.wargame-report-summary {
    font-size: 14px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-left: 3px solid #4dabf7;
    border-radius: 8px;
    padding: 12px 14px;
    word-break: break-word;
}

/* ---- 판정 히어로 배너 ---- */
.wg-verdict {
    border-radius: 10px;
    padding: 16px 18px;
    border: 1px solid rgba(255, 255, 255, 0.14);
}
.wg-verdict-eyebrow {
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: 0.7;
}
.wg-verdict-label {
    font-size: 26px;
    font-weight: 800;
    line-height: 1.15;
    margin-top: 2px;
}
.wg-verdict-sub {
    font-size: 13px;
    opacity: 0.85;
    margin-top: 2px;
}
.wg-tone-win {
    background: linear-gradient(135deg, rgba(47, 179, 68, 0.28), rgba(47, 179, 68, 0.08));
    border-color: rgba(47, 179, 68, 0.5);
}
.wg-tone-lose {
    background: linear-gradient(135deg, rgba(214, 57, 57, 0.28), rgba(214, 57, 57, 0.08));
    border-color: rgba(214, 57, 57, 0.5);
}
.wg-tone-draw {
    background: linear-gradient(135deg, rgba(245, 159, 0, 0.26), rgba(245, 159, 0, 0.08));
    border-color: rgba(245, 159, 0, 0.5);
}

/* ---- 지표 타일 ---- */
.wg-tiles {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
}
.wg-tile {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 10px 12px;
}
.wg-tile-k {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.55);
    margin-bottom: 3px;
}
.wg-tile-v {
    font-size: 19px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}
.wg-tile-v.wg-tile-sm {
    font-size: 14px;
    font-weight: 600;
}
.wg-unit {
    font-size: 12px;
    font-weight: 500;
    opacity: 0.6;
    margin-left: 2px;
}

/* ---- 손실 ---- */
.wg-loss {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
}
.wg-loss-side {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    gap: 12px;
}
.wg-loss-num {
    font-variant-numeric: tabular-nums;
    font-size: 13px;
}

/* ---- 교범 근거 ---- */
.wg-cites {
    list-style: none;
}
.wg-cite {
    font-size: 13px;
    padding: 4px 0;
    line-height: 1.4;
}
.wg-cite-tag {
    display: inline-block;
    background: rgba(84, 160, 255, 0.18);
    color: #86b7ff;
    border-radius: 4px;
    padding: 0 6px;
    margin-right: 6px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
}

.wg-details > summary {
    cursor: pointer;
    list-style: revert;
}

/* ---- 진행률 대기 화면 ---- */
.wg-loader {
    min-height: 360px;
    padding-top: 24px;
    padding-bottom: 24px;
}
.wg-ring-wrap {
    position: relative;
    width: 150px;
    height: 150px;
}
.wg-ring-track {
    fill: none;
    stroke: rgba(255, 255, 255, 0.1);
    stroke-width: 9;
}
.wg-ring-bar {
    fill: none;
    stroke: #4dabf7;
    stroke-width: 9;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.18s linear;
    filter: drop-shadow(0 0 6px rgba(77, 171, 247, 0.55));
}
.wg-ring-label {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}
.wg-ring-pct {
    font-size: 34px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    line-height: 1;
}
.wg-ring-pct span {
    font-size: 16px;
    opacity: 0.7;
    margin-left: 1px;
}
.wg-ring-sub {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.55);
    margin-top: 4px;
    letter-spacing: 0.08em;
}
.wg-steps {
    width: 260px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.wg-step {
    gap: 10px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.4);
    transition: color 0.2s ease;
}
.wg-step-dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1.5px solid rgba(255, 255, 255, 0.25);
    flex-shrink: 0;
    color: #fff;
}
.wg-step.active {
    color: #fff;
}
.wg-step.active .wg-step-dot {
    border-color: #4dabf7;
    box-shadow: 0 0 0 3px rgba(77, 171, 247, 0.2);
    animation: wg-pulse 1s ease-in-out infinite;
}
.wg-step.done {
    color: rgba(255, 255, 255, 0.75);
}
.wg-step.done .wg-step-dot {
    background: #2fb344;
    border-color: #2fb344;
}
@keyframes wg-pulse {
    0%, 100% { box-shadow: 0 0 0 3px rgba(77, 171, 247, 0.2); }
    50% { box-shadow: 0 0 0 5px rgba(77, 171, 247, 0.08); }
}
</style>
