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

            <!-- 적(RED) 선택 + 아군 공격자 있을 때: 사거리 판정 + 공격 지정 -->
            <div
                v-if='atk'
                class='wargame-attack mt-2 pt-2'
            >
                <div
                    class='mb-1'
                    style='font-size: 12px; color: rgba(255,255,255,0.6);'
                >
                    {{ atk.attacker.name }} → {{ atk.target.name }}
                    · {{ (atk.distance / 1000).toFixed(1) }}km
                </div>
                <button
                    v-if='atk.inRange && !atk.designated'
                    type='button'
                    class='btn btn-danger btn-sm w-100'
                    @click='designateAttack'
                >
                    공격 지정
                </button>
                <div
                    v-else-if='atk.designated'
                    class='text-danger fw-bold'
                    style='font-size: 13px;'
                >
                    ✓ 공격 지정됨
                </div>
                <div
                    v-else
                    class='text-secondary'
                    style='font-size: 13px;'
                >
                    사거리 밖 (5km 초과)
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang='ts'>
import { computed } from 'vue';
import { IconX } from '@tabler/icons-vue';
import { useWargameStore } from '../../stores/wargame.ts';

const store = useWargameStore();
const unit = computed(() => store.selectedUnit);
const atk = computed(() => store.attackContext);

function designateAttack(): void {
    const ctx = store.attackContext;
    if (!ctx || !ctx.inRange) return;
    store.addAttack(ctx.attacker.id, ctx.target.id);
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
