<template>
    <!-- 대화 영역 (펼침 시, 하단 바 위로) — 고정 높이 + 상단 리사이즈 핸들 -->
    <div
        v-if='expanded'
        class='wargame-convo-wrap position-absolute d-flex flex-column'
        :style='{ height: convoHeight + "px" }'
    >
        <!-- 리사이즈 핸들 (이 위에서 시작한 드래그만 리사이즈) -->
        <div
            class='wargame-resize-handle flex-shrink-0 d-flex align-items-center justify-content-center'
            title='드래그하여 높이 조절'
            @mousedown.stop.prevent='startResize'
        >
            <div class='wargame-resize-grip' />
        </div>

        <!-- 대화 스크롤 영역 -->
        <div
            ref='scrollRef'
            class='wargame-convo-scroll flex-grow-1 text-white px-3 py-2'
        >
            <div
                v-if='!chat.messages.length'
                class='text-secondary text-center mt-2'
                style='font-size: 13px;'
            >
                튜터에게 상황을 보고하거나 명령을 입력하세요.
            </div>
            <div
                v-for='(msg, i) in chat.messages'
                :key='i'
                class='d-flex mb-2'
                :class='msg.role === "user" ? "justify-content-end" : "justify-content-start"'
            >
                <div
                    class='wargame-bubble'
                    :class='msg.role === "user" ? "wargame-bubble-user" : "wargame-bubble-agent"'
                    v-text='msg.content'
                />
            </div>
            <div
                v-if='chat.sending'
                class='text-secondary'
                style='font-size: 12px;'
            >
                튜터 응답 중…
            </div>
        </div>
    </div>

    <!-- 하단 통합 바 -->
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

        <!-- 대화 접기/펼치기 토글 -->
        <button
            type='button'
            class='btn btn-sm wargame-toggle d-flex align-items-center flex-shrink-0'
            :title='expanded ? "대화 접기" : "대화 펼치기"'
            @click='expanded = !expanded'
        >
            <IconChevronDown
                v-if='expanded'
                :size='18'
                stroke='2'
            />
            <IconChevronUp
                v-else
                :size='18'
                stroke='2'
            />
            <span
                v-if='chat.messages.length'
                class='ms-1'
                style='font-size: 12px;'
                v-text='chat.messages.length'
            />
        </button>

        <!-- 통합 입력창 -->
        <input
            v-model='draft'
            type='text'
            class='form-control form-control-sm wargame-input flex-grow-1'
            placeholder=''
            @keyup.enter='send'
        >

        <!-- 전송 -->
        <button
            type='button'
            class='btn btn-primary btn-sm d-flex align-items-center flex-shrink-0'
            :disabled='!draft.trim() || chat.sending'
            @click='send'
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

        <!-- 게임 종료 -->
        <button
            type='button'
            class='btn btn-outline-warning btn-sm d-flex align-items-center flex-shrink-0'
            @click='chat.openReport()'
        >
            <IconFlagCheck
                :size='16'
                stroke='1.5'
                class='me-1'
            />
            게임 종료
        </button>
    </div>
</template>

<script setup lang='ts'>
import { ref, nextTick, watch, onBeforeUnmount } from 'vue';
import {
    IconFlag,
    IconSend,
    IconPlayerTrackNext,
    IconFlagCheck,
    IconChevronDown,
    IconChevronUp,
} from '@tabler/icons-vue';
import { useWargameChatStore } from '../../stores/wargameChat.ts';
import { useWargameStore } from '../../stores/wargame.ts';
import { buildAgentPayload } from '../../base/wargamePayload.ts';
import { resolveTurn } from '../../base/wargameResolve.ts';

// 대화 로직은 기존 store/getAgentResponse/generateReport 를 그대로 재사용한다.
const chat = useWargameChatStore();
const units = useWargameStore();

const turn = ref<number>(1);        // 턴은 로컬 state (기존 동작 유지)
const draft = ref<string>('');
const expanded = ref<boolean>(false); // 기본 접힘
const scrollRef = ref<HTMLElement | null>(null);

// 대화 영역 높이 (세션 state). 기본은 화면을 많이 가리지 않는 축소 높이.
const MIN_H = 80;
const DEFAULT_H = 220;
const convoHeight = ref<number>(DEFAULT_H);

function maxHeight(): number {
    // 화면의 약 60% 상한
    return typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.6) : 600;
}

function clampHeight(h: number): number {
    return Math.max(MIN_H, Math.min(h, maxHeight()));
}

// ---- 리사이즈 (상단 핸들에서 시작한 드래그만) --------------------------------
let resizeStartY = 0;
let resizeStartH = 0;

function onResizeMove(e: MouseEvent): void {
    // 위로 끌면(clientY 감소) 커지고, 아래로 끌면 작아짐
    const dy = resizeStartY - e.clientY;
    convoHeight.value = clampHeight(resizeStartH + dy);
}

function onResizeEnd(): void {
    window.removeEventListener('mousemove', onResizeMove);
    window.removeEventListener('mouseup', onResizeEnd);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
}

function startResize(e: MouseEvent): void {
    // 핸들에서만 시작. @mousedown.stop.prevent 로 지도(팬/줌) 전파 차단.
    resizeStartY = e.clientY;
    resizeStartH = convoHeight.value;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';
    window.addEventListener('mousemove', onResizeMove);
    window.addEventListener('mouseup', onResizeEnd);
}

onBeforeUnmount(onResizeEnd);

// ---- 대화 ------------------------------------------------------------------
function scrollToBottom(): void {
    void nextTick(() => {
        if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
    });
}

async function send(): Promise<void> {
    const text = draft.value.trim();
    if (!text || chat.sending) return;
    draft.value = '';
    expanded.value = true;             // 전송 시 자동 펼침

    // 턴 종료 후 서술 대기 중이면, 이 입력을 rationale 로 처리하고 payload 조립 → 리포트
    if (units.awaitingRationale) {
        chat.pushUserMessage(text);
        units.setRationale(text);
        units.setAwaitingRationale(false);

        // 턴 종료 시점에 얼려둔 스냅샷을 전송한다(서술 쓰는 동안 바뀐 실시간 값이 아니라).
        const snap = units.savedSnapshot;
        const payload = buildAgentPayload({
            decision: snap?.decision ?? units.turnDecision,
            rationale: text,
            units: snap?.units ?? units.units,
            attacks: snap?.attacks ?? units.attacks,
        });
        units.setLastPayload(payload);
        console.log('[Wargame] 조립된 payload:', payload);

        // 백엔드 브리지(/wargame/resolve → ai-agent 엔진)로 판정 요청
        units.setResolving(true);
        units.setEngineResult(null);
        chat.openReport();          // 리포트를 먼저 열고 "판정 중" 표시
        scrollToBottom();
        try {
            const res = await resolveTurn(payload);
            units.setEngineResult(res);
            console.log('[Wargame] 엔진 판정 결과:', res);
        } catch (e) {
            units.setResolveError(e instanceof Error ? e.message : String(e));
            console.error('[Wargame] 판정 실패:', e);
        } finally {
            units.setResolving(false);
        }
        return;
    }

    await chat.sendMessage(text);      // 유저 메시지 + 임시 에이전트 응답 (기존 로직)
    scrollToBottom();
}

function endTurn(): void {
    // 턴 종료 = 이 시점의 부대 위치/공격/결정을 스냅샷으로 저장(아직 전송 안 함).
    units.saveSnapshot();
    // 그리고 서술 요청. 다음 유저 입력을 rationale 로 받아 전송한다(send 에서 분기).
    chat.pushAgentMessage('이번 턴의 행동에 대해 왜 그렇게 결정하셨는지 서술해 주세요.');
    units.setAwaitingRationale(true);
    expanded.value = true;
    scrollToBottom();
    console.log('[Wargame] 턴 종료 → 위치 저장 + 서술 요청');
}

// 메시지 추가/펼침 시 최신 메시지로 스크롤
watch(() => chat.messages.length, scrollToBottom);
watch(expanded, (v) => { if (v) scrollToBottom(); });
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

.wargame-toggle {
    background-color: rgba(255, 255, 255, 0.08);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.2);
}
.wargame-toggle:hover {
    background-color: rgba(255, 255, 255, 0.16);
    color: #fff;
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

/* 대화 영역: 하단 바(48px) + 상태바(50px) 위에서 고정 높이(convoHeight)로 표시.
   배경 딤은 이 wrap 에만 적용되어 대화 영역 크기만큼만 지도를 덮는다(가독성 유지). */
.wargame-convo-wrap {
    left: 0;
    right: 0;
    bottom: calc(var(--map-bottom-bar-size, 50px) + 48px);
    z-index: 10;
    background-color: rgba(0, 0, 0, 0.78);
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    overflow: hidden;
}
.wargame-resize-handle {
    height: 12px;
    cursor: ns-resize;
    background-color: rgba(255, 255, 255, 0.06);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.wargame-resize-grip {
    width: 44px;
    height: 4px;
    border-radius: 2px;
    background-color: rgba(255, 255, 255, 0.35);
}
.wargame-convo-scroll {
    overflow-y: auto;
    min-height: 0;
}
.wargame-bubble {
    max-width: 60%;
    padding: 7px 11px;
    border-radius: 12px;
    font-size: 14px;
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-word;
}
.wargame-bubble-agent {
    background-color: rgba(255, 255, 255, 0.14);
    color: #fff;
    border-top-left-radius: 3px;
}
.wargame-bubble-user {
    background-color: #1971c2;
    color: #fff;
    border-top-right-radius: 3px;
}
</style>
