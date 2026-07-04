<template>
    <div class='wargame-decision position-absolute d-flex align-items-center text-white px-2 py-1'>
        <span
            class='me-2'
            style='font-size: 13px; color: rgba(255,255,255,0.7);'
        >이번 턴</span>
        <div class='btn-group btn-group-sm'>
            <button
                type='button'
                class='btn btn-sm'
                :class='game.turnDecision === "attack" ? "btn-danger" : "btn-outline-light"'
                @click='game.setDecision("attack")'
            >
                공격
            </button>
            <button
                type='button'
                class='btn btn-sm'
                :class='game.turnDecision === "defense" ? "btn-primary" : "btn-outline-light"'
                @click='game.setDecision("defense")'
            >
                수비
            </button>
        </div>
    </div>
</template>

<script setup lang='ts'>
import { useWargameStore } from '../../stores/wargame.ts';

const game = useWargameStore();
</script>

<style scoped>
.wargame-decision {
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 5;
    background-color: rgba(0, 0, 0, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
}
</style>
