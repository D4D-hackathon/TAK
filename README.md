# TAK Wargame Platform

<img src="docs/TAK_Screenshot.png" alt="휴인스 Ubrain 모델">

CloudTAK를 기반으로 만든 웹 워게임 플랫폼입니다. 사용자는 브라우저 지도에서 OpenStreetMap 기반 전장도를 보고, 철원 전차대대 시나리오의 부대 배치를 이동/선택/공격 지정하면서 턴 단위 의사결정을 수행합니다. 이 프로젝트는 지도 UI, TAK Server 연동, 부대 상태 관리, 턴 payload 생성, 판정 결과 표시를 담당합니다.

워게임 판정과 감독/수행 로직은 별도 AI agent 프로젝트와 연동하는 구조입니다.

- AI agent: https://github.com/D4D-hackathon/ai-agent
- 이 저장소: CloudTAK 기반 지도 클라이언트, TAK 연동, 워게임 UI, agent 호출 브리지

## 서비스 개요

플랫폼은 “전장 상황판 + 워게임 진행 UI + AI 판정 엔진 연동”으로 구성됩니다.

```text
사용자
  -> CloudTAK Web
     - 지도 확인
     - 부대 선택/이동
     - 공격 대상 지정
     - 턴 종료 및 지휘관 서술 입력

CloudTAK Web
  -> CloudTAK API
     - 로그인
     - TAK Server 인증서/프로필 관리
     - basemap/overlay/mission/CoT API 제공

CloudTAK Web
  -> Backend / AI Agent
     - /wargame/resolve 로 턴 판정 요청
     - /terrain/places 로 부대 위치 지형 조회

CloudTAK API
  -> TAK Server
     - CoT TLS 연결
     - Marti API 호출
     - 인증서 발급/저장
```

## 주요 기능

- 지도 기반 상황판: Vue/Vite와 MapLibre 기반 웹 지도
- 부대 배치 표시: `units-cheorwon.geojson`의 아군/적군 부대를 군대부호와 callsign으로 렌더링
- 부대 조작: 아군 부대 선택, 드래그 이동, 이동 가능 반경 표시
- 공격 지정: 아군 공격 모드, 공격 사거리 표시, 사거리 내 적군 대상 지정
- 턴 진행: 공격/수비 결정, 턴 종료, 지휘관 서술 입력, 턴 snapshot 저장
- AI agent 연동: 현재 턴의 부대 위치, 공격 지정, 지휘관 서술을 `/wargame/resolve`로 전송
- 판정 리포트: agent 판정 결과, 전력비, 성공확률, 지형 정보, 최종 위치, 대화 기록 표시
- TAK 연동: CloudTAK 로그인, TAK Server 인증서 발급, CoT/WebSocket/Marti API 연동

## 워게임 규칙

현재 프론트엔드에 구현된 기본 규칙은 다음과 같습니다.

```text
시나리오: cheorwon-defense-demo
부대 데이터: api/web/public/demo-layers/units-cheorwon.geojson
이동 가능 거리: 턴 시작 위치 기준 7km
공격 사거리: 공격 부대 현재 위치 기준 5km
이동 가능 진영: BLUE, 아군
적군 처리: RED, 선택/정보 확인은 가능하지만 이동 불가
턴 선택지: attack 또는 defense
```

부대 이동과 공격 지정은 브라우저 state에 반영됩니다. 새로고침하면 정적 GeoJSON의 초기 배치로 돌아갑니다.

## AI Agent 연동

AI agent는 워게임 판정과 감독/수행 역할을 맡는 외부 엔진입니다. 이 저장소의 웹 클라이언트는 턴 종료 시 다음 흐름으로 agent와 통신합니다.

```text
1. 사용자가 부대를 이동하고 공격 대상을 지정
2. 사용자가 턴 종료
3. 프론트가 현재 부대 위치, 공격 목록, 공격/수비 결정 상태를 snapshot으로 저장
4. 사용자가 이번 턴의 판단 근거를 서술
5. 프론트가 AgentPayload를 생성
6. POST /wargame/resolve 호출
7. backend가 ai-agent 엔진에 판정 요청
8. 프론트가 판정 결과를 리포트 화면에 표시
```

프론트가 보내는 payload 구조는 `api/web/src/base/wargamePayload.ts`에 정의되어 있습니다.

```ts
{
    scenario: 'cheorwon-defense-demo',
    player_decision: 'attack' | 'defense',
    player_rationale: string,
    units: [
        {
            id: string,
            name: string,
            side: string,
            type: string,
            strength: number,
            posture: string,
            position: [lon, lat],
            elevation_m: number | null
        }
    ],
    attacks: [
        {
            attacker_id: string,
            target_id: string,
            terrain: unknown | null
        }
    ]
}
```

개발 환경에서는 Vite proxy가 다음 요청을 `localhost:8000`의 backend로 전달합니다.

```text
/wargame/*  -> http://localhost:8000
/terrain/*  -> http://localhost:8000
```

관련 파일:

```text
api/web/src/base/wargameResolve.ts   /wargame/resolve 호출
api/web/src/base/wargamePayload.ts   agent 전송 payload 생성
api/web/src/base/wargamePlaces.ts    /terrain/places 지형 조회
api/web/src/stores/wargame.ts        부대/턴/공격 상태 관리
```

## 프로젝트 구조

```text
api/                         CloudTAK API 서버
api/routes/                  CloudTAK REST API 라우트
api/lib/                     인증, DB, TAK 연결, 모델, 유틸
api/web/                     CloudTAK 웹 클라이언트
api/web/src/base/wargame*.ts 워게임 지도/agent/terrain 로직
api/web/src/stores/wargame*  워게임 상태 관리
api/web/src/components/CloudTAK/Wargame* 워게임 UI
api/web/public/demo-layers/units-cheorwon.geojson 부대 배치 데이터
docs/demo-overlays.seed.sql  OpenStreetMap/부대 배치 DB seed
takserver-official/          로컬 TAK Server 소스/빌드 위치
tasks/events/                import/event 처리 워커
tasks/pmtiles/               PMTiles 타일 서비스
tasks/retention/             보존 정책 워커
```

## 실행 포트

로컬 개발 기준:

```text
CloudTAK Web:        http://localhost:8080
CloudTAK API:        http://localhost:5001
AI/terrain backend:  http://localhost:8000
TAK CoT TLS:         ssl://localhost:8089
TAK Marti API:       https://localhost:8443
TAK Cert/WebTAK API: https://localhost:8446
```

## 환경 설정

`api/.env`를 만들고 CloudTAK API가 사용할 값을 설정합니다.

```env
SigningSecret=<long-random-secret>

POSTGRES=postgres://<user>:<password>@<db-host>:5432/<cloudtak-db>

API_URL=http://localhost:5001
PMTILES_URL=http://localhost:5001
```

운영 배포에서는 다음을 준비합니다.

- Node.js 24 이상
- PostgreSQL/PostGIS
- TAK Server
- AI agent/backend 서비스
- 운영용 TLS 인증서
- 공개 접근이 필요한 경우 reverse proxy 또는 load balancer

운영 환경에서는 `NODE_TLS_REJECT_UNAUTHORIZED=0`을 사용하지 않습니다. 이 값은 로컬 self-signed TAK Server 인증서를 우회하기 위한 개발용 설정입니다.

## 로컬 실행

의존성 설치:

```bash
npm install
cd api && npm install
cd web && npm install --legacy-peer-deps
```

CloudTAK API:

```bash
cd api
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev
```

CloudTAK Web:

```bash
cd api/web
npm run serve
```

Vite가 `8080`을 사용할 수 없으면 `8081`, `8082` 같은 다음 포트를 사용합니다. 터미널에 표시되는 `Local:` 주소로 접속합니다.

AI agent/backend는 별도 저장소에서 실행합니다. 이 저장소의 프론트엔드는 `/wargame`과 `/terrain` 요청을 `localhost:8000`으로 프록시합니다.

## TAK Server 실행

로컬 TAK Server는 공식 TAK Server 소스를 빌드한 뒤 3개 프로파일로 실행합니다.

```bash
cd api
npm run takserver:config
npm run takserver:messaging
npm run takserver:api
```

각 명령은 별도 터미널에서 실행합니다. 스크립트는 기본적으로 다음 위치의 TAK Server 예제 디렉터리와 WAR 파일을 사용합니다.

```text
takserver-official/src/takserver-core/example
takserver-official/src/takserver-core/build/libs/takserver-core-*.war
```

## 데모 데이터 적용

CloudTAK DB에 OpenStreetMap basemap과 부대 배치 레이어를 넣습니다.

```bash
psql 'postgres://cloudtak:cloudtak@localhost:5432/tak_ps_etl' -f docs/demo-overlays.seed.sql
```

seed에 포함되는 항목:

- `OpenStreetMap`
- `부대 배치`

부대 배치 원본:

```text
api/web/public/demo-layers/units-cheorwon.geojson
```

## 빌드와 검사

API 빌드:

```bash
cd api
npm run build
```

웹 빌드:

```bash
cd api/web
npm run build
```

웹 테스트:

```bash
cd api/web
npm run test
```

API 테스트는 별도 테스트 DB와 환경 구성이 필요합니다.

```bash
cd api
npm run test
```

## 보안 주의사항

다음 파일과 데이터는 저장소에 커밋하지 않습니다.

- `api/.env`
- 인증서와 private key 파일
- TAK Server truststore/keystore
- 로컬 DB dump
- 운영 계정/토큰/서명 키
- `node_modules/`
- 빌드 산출물

공개 배포 시에는 CloudTAK Web/API를 443 뒤에 두고, TAK Server의 CoT TLS와 Marti API 포트는 필요한 대상에게만 제한적으로 노출합니다.
