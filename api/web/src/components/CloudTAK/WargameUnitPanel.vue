<template>
    <div
        v-if='unit'
        class='wargame-unit-panel position-absolute text-white'
    >
        <div class='d-flex align-items-center justify-content-between px-3 py-2 wargame-panel-header'>
            <div class='d-flex align-items-center'>
                <span
                    class='wargame-side-dot me-2'
                    :style='{ backgroundColor: sideColor }'
                />
                <span
                    class='fw-bold'
                    style='font-size: 16px;'
                    v-text='unit.name'
                />
            </div>
            <div
                role='button'
                class='cloudtak-hover cursor-pointer d-flex'
                title='닫기'
                @click='close'
            >
                <IconX
                    :size='20'
                    stroke='1.5'
                />
            </div>
        </div>

        <div class='px-3 py-2'>
            <div class='wargame-row'>
                <span class='wargame-label'>진영</span>
                <span :style='{ color: sideColor }'>{{ sideLabel }}</span>
            </div>
            <div class='wargame-row'>
                <span class='wargame-label'>병종</span>
                <span v-text='typeLabel' />
            </div>
            <div class='wargame-row'>
                <span class='wargame-label'>전력</span>
                <span>전차 {{ unit.strength }}대</span>
            </div>
            <div class='wargame-row'>
                <span class='wargame-label'>태세</span>
                <span v-text='postureLabel' />
            </div>
            <div
                v-if='unit.note'
                class='wargame-note mt-2'
            >
                <span class='wargame-label d-block mb-1'>비고</span>
                <span v-text='unit.note' />
            </div>
            <div
                class='wargame-hint mt-2'
                v-text='dragHint'
            />

            <!-- 아군(BLUE): 공격 버튼 → 사거리 원 표시 + 대상 선택 -->
            <div
                v-if='unit.side === "BLUE"'
                class='wargame-attack mt-2 pt-2'
            >
                <button
                    v-if='!inAttackMode'
                    type='button'
                    class='btn btn-danger btn-sm w-100 d-flex align-items-center justify-content-center'
                    @click='store.enterAttackMode(unit.id)'
                >
                    <IconSword
                        :size='16'
                        stroke='1.5'
                        class='me-1'
                    />
                    공격
                </button>
                <template v-else>
                    <div class='text-warning fw-bold mb-1' style='font-size: 13px;'>
                        🎯 공격 대상 선택 — 사거리(5km) 안의 적을 클릭
                    </div>
                    <button
                        type='button'
                        class='btn btn-outline-light btn-sm w-100'
                        @click='store.exitAttackMode()'
                    >
                        취소
                    </button>
                </template>
                <div
                    v-if='myAttackTarget'
                    class='mt-2 text-danger'
                    style='font-size: 13px;'
                >
                    ✓ 공격 지정: {{ myAttackTarget }}
                </div>
            </div>

            <!-- 적(RED): 공격 대상 상태 -->
            <div
                v-else-if='unit.side === "RED"'
                class='wargame-attack mt-2 pt-2'
            >
                <div
                    v-if='attackerOnMe'
                    class='text-danger fw-bold'
                    style='font-size: 13px;'
                >
                    ✓ {{ attackerOnMe }} 의 공격 대상
                    <button
                        type='button'
                        class='btn btn-outline-light btn-sm w-100 mt-1'
                        @click='clearMyAttack'
                    >
                        지정 해제
                    </button>
                </div>
                <div
                    v-else-if='atk'
                    :class='atk.inRange ? "text-warning" : "text-secondary"'
                    style='font-size: 13px;'
                >
                    {{ atk.attacker.name }} → 이 부대 · {{ (atk.distance / 1000).toFixed(1) }}km
                    {{ atk.inRange ? '(클릭 시 지정)' : '— 사거리 밖 (5km 초과), 더 접근 필요' }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang='ts'>
import { computed } from 'vue';
import { IconX, IconSword } from '@tabler/icons-vue';
import { useWargameStore } from '../../stores/wargame.ts';

const store = useWargameStore();
const unit = computed(() => store.selectedUnit);
const atk = computed(() => store.attackContext);

// 이 아군이 지금 공격 모드(대상 선택 대기)인지
const inAttackMode = computed(() => store.attackModeUnitId === unit.value?.id);

// 이 아군이 지정한 공격 대상 이름 (있으면)
const myAttackTarget = computed(() => {
    const a = store.attacks.find((x) => x.attacker_id === unit.value?.id);
    if (!a) return null;
    return store.units.find((u) => u.id === a.target_id)?.name ?? a.target_id;
});

// 선택된 적을 공격 대상으로 지정한 아군 이름 (있으면)
const attackerOnMe = computed(() => store.attackerOnSelected?.name ?? null);

function clearMyAttack(): void {
    // 이 적을 대상으로 하는 공격 지정 해제
    const a = store.attacks.find((x) => x.target_id === unit.value?.id);
    if (a) store.removeAttack(a.attacker_id);
}

const sideColor = computed(() => (unit.value?.side === 'RED' ? '#ff8080' : '#80e0ff'));
const sideLabel = computed(() => {
    if (unit.value?.side === 'BLUE') return '아군 (청군)';
    if (unit.value?.side === 'RED') return '적군 (홍군)';
    return unit.value?.side ?? '';
});
const typeLabel = computed(() => (unit.value?.type === 'armor' ? '기갑' : unit.value?.type ?? ''));
const postureLabel = computed(() => {
    const map: Record<string, string> = {
        defensive: '방어',
        offensive: '공세',
        reserve: '예비',
    };
    const p = unit.value?.posture ?? '';
    return map[p] ?? p;
});
const dragHint = computed(() =>
    unit.value?.side === 'BLUE' ? '↔ 드래그하여 이동 가능' : '적군 — 이동 불가',
);

function close(): void {
    store.clearSelection();
}
</script>

<style scoped>
.wargame-unit-panel {
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 280px;
    z-index: 5;
    background-color: rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    overflow: hidden;
}
.wargame-panel-header {
    background-color: rgba(255, 255, 255, 0.06);
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}
.wargame-side-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
}
.wargame-row {
    display: flex;
    justify-content: space-between;
    padding: 3px 0;
    font-size: 14px;
}
.wargame-label {
    color: rgba(255, 255, 255, 0.55);
}
.wargame-note {
    font-size: 13px;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.85);
}
.wargame-hint {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.45);
}
.wargame-attack {
    border-top: 1px solid rgba(255, 255, 255, 0.12);
}
</style>
