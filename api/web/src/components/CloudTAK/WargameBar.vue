<template>
    <!-- 최근 입력받은 지시 표시 (전송 시에만) -->
    <div
        v-if='lastCommand'
        class='position-absolute start-0 end-0 text-white px-3 py-1 wargame-last-command'
    >
        <span class='text-secondary me-2'>입력받음:</span>
        <span v-text='lastCommand' />
    </div>

    <!-- 워게임 컨트롤 바 -->
    <div
        class='position-absolute start-0 end-0 text-white d-flex align-items-center gap-2 px-3 wargame-bar'
    >
        <!-- 현재 턴 -->
        <div class='wargame-turn d-flex align-items-center flex-shrink-0 px-3 py-1'>
            <IconFlag
                :size='18'
                stroke='1.5'
                class='me-2'
            />
            <span
                class='fw-bold'
                v-text='`턴 ${turn}`'
            />
        </div>

        <!-- 지시 입력창 -->
        <input
            v-model='commandText'
            type='text'
            class='form-control form-control-sm wargame-input flex-grow-1'
            placeholder='명령을 입력하세요 (예: 3대대를 동쪽 계곡으로 기동)'
            @keyup.enter='sendCommand'
        >

        <!-- 전송 -->
        <button
            type='button'
            class='btn btn-primary btn-sm d-flex align-items-center flex-shrink-0'
            :disabled='!commandText.trim()'
            @click='sendCommand'
        >
            <IconSend
                :size='16'
                stroke='1.5'
                class='me-1'
            />
            전송
        </button>

        <!-- 턴 종료 -->
        <button
            type='button'
            class='btn btn-outline-light btn-sm d-flex align-items-center flex-shrink-0'
            @click='endTurn'
        >
            <IconPlayerTrackNext
                :size='16'
                stroke='1.5'
                class='me-1'
            />
            턴 종료
        </button>
    </div>
</template>

<script setup lang='ts'>
import { ref } from 'vue';
import { IconFlag, IconSend, IconPlayerTrackNext } from '@tabler/icons-vue';

// 로컬 state만 사용 (백엔드/판정 없음 — 이번 단계 범위 밖)
const turn = ref<number>(1);
const commandText = ref<string>('');
const lastCommand = ref<string>('');

function sendCommand(): void {
    const text = commandText.value.trim();
    if (!text) return;

    // 실제 파싱/판정은 하지 않음. 화면 표시 + 콘솔 로그만.
    lastCommand.value = text;
    console.log('[Wargame] 입력받음:', text, '(턴', turn.value + ')');

    commandText.value = '';
}

function endTurn(): void {
    turn.value += 1;
    console.log('[Wargame] 턴 종료 → 현재 턴:', turn.value);
}
</script>

<style scoped>
.wargame-bar {
    height: 48px;
    bottom: var(--map-bottom-bar-size, 50px);
    z-index: 10;
    background-color: rgba(0, 0, 0, 0.7);
    border-top: 1px solid rgba(255, 255, 255, 0.15);
}

.wargame-turn {
    background-color: rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    font-size: 15px;
}

.wargame-input {
    background-color: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #fff;
    max-width: none;
}
.wargame-input::placeholder {
    color: rgba(255, 255, 255, 0.5);
}
.wargame-input:focus {
    background-color: rgba(255, 255, 255, 0.15);
    color: #fff;
    box-shadow: none;
    border-color: rgba(255, 255, 255, 0.4);
}

.wargame-last-command {
    height: 28px;
    bottom: calc(var(--map-bottom-bar-size, 50px) + 48px);
    z-index: 10;
    background-color: rgba(0, 0, 0, 0.55);
    font-size: 13px;
    line-height: 20px;
}
</style>
