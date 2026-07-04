/**
 * Wargame 채팅 스토어 (프론트 state 전용, DB/백엔드 저장 없음)
 *
 * 대화 기록 + 채팅/리포트 패널 열림 상태를 관리한다. 에이전트 응답과 리포트 생성은
 * base/wargameAgent.ts 로 분리돼 있어(LLM 교체 지점), 여기서는 흐름만 담당한다.
 */
import { defineStore } from 'pinia';
import {
    getAgentResponse,
    generateReport,
    type ChatMessage,
    type WargameReport,
} from '../base/wargameAgent.ts';

export const useWargameChatStore = defineStore('wargameChat', {
    state: () => ({
        messages: [] as ChatMessage[],
        open: false,
        sending: false,
        reportOpen: false,
        report: null as WargameReport | null,
    }),

    actions: {
        toggle(): void {
            this.open = !this.open;
        },

        /** 에이전트 메시지를 직접 추가 (예: 턴 종료 후 서술 요청) */
        pushAgentMessage(content: string): void {
            this.messages.push({ role: 'agent', content, timestamp: Date.now() });
        },

        /** 유저 메시지를 직접 추가 (에이전트 응답 없이 기록만; 예: 서술 답변) */
        pushUserMessage(content: string): void {
            this.messages.push({ role: 'user', content, timestamp: Date.now() });
        },

        close(): void {
            this.open = false;
        },

        /** 유저 메시지 전송 → 기록 추가 → 에이전트 응답 추가 */
        async sendMessage(text: string): Promise<void> {
            const content = text.trim();
            if (!content || this.sending) return;

            this.messages.push({ role: 'user', content, timestamp: Date.now() });

            this.sending = true;
            try {
                // LLM 교체 지점 (base/wargameAgent.ts)
                const reply = await getAgentResponse(content, this.messages);
                this.messages.push({ role: 'agent', content: reply, timestamp: Date.now() });
            } finally {
                this.sending = false;
            }
        },

        /** 게임 종료 → 현재 대화로 리포트 생성 후 표시 */
        openReport(): void {
            this.report = generateReport(this.messages);
            this.reportOpen = true;
        },

        closeReport(): void {
            this.reportOpen = false;
        },

        reset(): void {
            this.messages = [];
            this.report = null;
            this.reportOpen = false;
        },
    },
});
