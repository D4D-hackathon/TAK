/**
 * Wargame 에이전트 (LLM 교체 지점)
 *
 * ⚠️ 현재는 LLM 미연동 껍데기다. 아래 두 함수 내부만 실제 LLM 호출로 교체하면
 *    실제 AI 튜터가 된다. UI/스토어는 이 함수들의 시그니처만 의존한다.
 */

export type ChatRole = 'agent' | 'user';

export interface ChatMessage {
    role: ChatRole;
    content: string;
    timestamp: number;
}

export interface WargameReport {
    title: string;
    scenario: string;
    timeline: ChatMessage[];
    decisions: string[];
    summary: string;
}

// 임시 에이전트 응답 (순환). 실제 판단/LLM 없음.
const CANNED_REPLIES = [
    '(임시) 상황을 확인했습니다. 다음 결정을 알려주세요.',
    '(임시) 명령을 접수했습니다. 부대 배치를 계속 검토하십시오.',
    '(임시) 이해했습니다. 적 동향을 주시하며 다음 지시를 내려주세요.',
    '(임시) 반영했습니다. 예비대 운용도 고려해 보시겠습니까?',
];

let replyIndex = 0;

/**
 * 유저 메시지에 대한 에이전트 응답을 반환한다.
 *
 * // TODO: 이 내부를 LLM API 호출로 교체.
 * //       userMessage 와 chatHistory(+ 나중에 부대상태/지형 컨텍스트)를 LLM 에 보내
 * //       응답 텍스트를 받아 반환한다. 시그니처(async → Promise<string>)는 유지.
 */
export async function getAgentResponse(
    userMessage: string,
    chatHistory: ChatMessage[],
): Promise<string> {
    // 현재: 고정 문구 순환 (userMessage/chatHistory 는 아직 사용하지 않음)
    void userMessage;
    void chatHistory;
    const reply = CANNED_REPLIES[replyIndex % CANNED_REPLIES.length];
    replyIndex += 1;
    return reply;
}

/**
 * 대화 기록으로 게임 종료 리포트를 생성한다.
 *
 * // TODO: LLM 으로 총평/평가 자동 생성. 현재는 대화를 정리한 수준만 반환한다.
 */
export function generateReport(chatHistory: ChatMessage[]): WargameReport {
    const decisions = chatHistory
        .filter((m) => m.role === 'user')
        .map((m) => m.content);

    return {
        title: '철원 방어 - 적 남하 저지',
        scenario: 'cheorwon-defense-demo',
        timeline: [...chatHistory],
        decisions,
        // TODO: LLM 연동 시 총평을 자동 생성해 이 자리에 채운다.
        summary: '(LLM 연동 시 자동 생성)',
    };
}
