# CloudTAK 로컬 아키텍처 정리

이 문서는 현재 `/Users/jeongmin-yong/CloudTAK` 폴더에 구성된 로컬 CloudTAK + TAK Server 환경을 기준으로 설명한다.

## 1. 전체 구성

현재 로컬 환경은 크게 5개 컴포넌트로 나뉜다.

```text
브라우저
  |
  | http://localhost:8081
  v
CloudTAK Web, Vite dev server
  |
  | /api/* 요청
  v
CloudTAK API, Node.js
  |
  | PostgreSQL
  v
CloudTAK DB

CloudTAK API
  |
  | https://localhost:8443, https://localhost:8446, ssl://localhost:8089
  v
TAK Server
  |
  | PostgreSQL
  v
TAK Server DB
```

현재 포트는 다음과 같다.

```text
CloudTAK Web:        http://localhost:8081
CloudTAK API:        http://localhost:5001
TAK CoT TLS:         ssl://localhost:8089
TAK Marti API:       https://localhost:8443
TAK Cert/WebTAK API: https://localhost:8446
CloudTAK DB:         PostgreSQL tak_ps_etl
TAK Server DB:       PostgreSQL cot
```

## 2. 프론트엔드: CloudTAK Web

프론트엔드는 `api/web` 아래의 Vue + Vite 앱이다.

주요 역할은 다음과 같다.

- 로그인 화면 표시
- 지도 화면 표시
- MapLibre 기반 지도 렌더링
- overlay/layer 목록 표시
- 사용자가 layer on/off, opacity, 순서 등을 바꾸면 CloudTAK API로 저장
- WebSocket 또는 API 응답을 통해 지도 데이터를 갱신

현재 실행 명령은 다음과 같다.

```bash
cd /Users/jeongmin-yong/CloudTAK/api/web
npm run serve
```

Vite가 8080을 못 쓰면 자동으로 8081, 8082 같은 다른 포트를 사용한다. 브라우저는 터미널에 표시된 `Local:` 주소로 접속해야 한다.

## 3. 백엔드: CloudTAK API

CloudTAK API는 `api` 아래의 Node.js 서버다.

현재 설정 파일은 다음이다.

```text
api/.env
```

현재 주요 설정은 다음과 같다.

```json
{
  "POSTGRES": "postgres://cloudtak:cloudtak@localhost:5432/tak_ps_etl",
  "API_URL": "http://localhost:5001",
  "PMTILES_URL": "http://localhost:5001",
  "CLOUDTAK_Mode": "docker-compose"
}
```

현재 실행 명령은 다음과 같다.

```bash
cd /Users/jeongmin-yong/CloudTAK/api
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev
```

`NODE_TLS_REJECT_UNAUTHORIZED=0`은 로컬 self-signed TAK Server 인증서를 우회하기 위해 붙인 것이다. 로컬 해커톤 환경에서는 괜찮지만 운영 환경에서는 쓰면 안 된다.

CloudTAK API의 주요 역할은 다음과 같다.

- CloudTAK 사용자 로그인 처리
- CloudTAK DB 조회/저장
- TAK Server 인증서 발급 요청
- TAK Server Marti API 호출
- TAK CoT 연결 관리
- 지도 basemap, overlay, mission, feature 관련 API 제공
- 브라우저와 WebSocket 통신

## 4. TAK Server

TAK Server는 공식 TAK Server 5.7 소스 빌드로 구성되어 있다.

위치:

```text
takserver-official/src/takserver-core/example
```

현재 3개 프로세스로 실행한다.

```text
config
messaging
api
```

각 역할은 대략 다음과 같다.

```text
config:
  TAK Server 설정/클러스터 설정 담당

messaging:
  CoT 메시지 처리
  클라이언트 위치, 이벤트, 채팅, mission 관련 메시지 처리
  ssl://localhost:8089 사용

api:
  Marti REST API, 인증서 발급 API 제공
  https://localhost:8443
  https://localhost:8446
```

현재 CloudTAK에 등록된 TAK Server 설정은 다음이다.

```text
name:   Local TAK Server
url:    ssl://localhost:8089
api:    https://localhost:8443
webtak: https://localhost:8446
```

CloudTAK 로그인 시 실제 흐름은 다음과 같다.

```text
1. 사용자가 CloudTAK Web에서 cloudtak / CloudTAKAdmin1!Hack 로그인
2. Web이 CloudTAK API /api/login 호출
3. CloudTAK API가 TAK Server 8446에 username/password로 인증
4. 필요하면 TAK Server에서 사용자 인증서 발급
5. 발급된 cert/key를 CloudTAK DB profile.auth에 저장
6. CloudTAK API가 JWT를 Web에 반환
7. Web은 JWT로 이후 API 요청을 수행
```

즉, CloudTAK 로그인은 단순히 CloudTAK DB만 보는 것이 아니라 TAK Server 인증과도 연결되어 있다.

## 5. 데이터베이스

현재 DB는 두 종류가 있다.

### 5.1 CloudTAK DB

```text
DB name: tak_ps_etl
role:    cloudtak
```

CloudTAK API가 사용하는 DB다.

주요 테이블 예시는 다음과 같다.

```text
server:
  CloudTAK이 붙을 TAK Server 정보

profile:
  CloudTAK 사용자
  TAK 사용자 인증서 cert/key도 여기에 저장됨

profile_overlays:
  사용자별 지도 overlay/layer 설정
  visible, opacity, type, mode, url, styles 등이 저장됨

basemaps:
  OpenStreetMap 같은 기본 지도 설정

settings:
  map::basemap 같은 전역 설정
```

현재 `cloudtak` 사용자의 overlay 상태는 다음과 같다.

```text
OpenStreetMap:
  type: raster
  mode: basemap
  visible: true
  url: /api/basemap/1/tiles

Layer 1: 경계 구역:
  type: geojson
  mode: demo
  visible: false
  url: /demo-layers/boundary-zones.geojson

Layer 2: 드론 위험 구역:
  type: geojson
  mode: demo
  visible: false
  url: /demo-layers/drone-risk-zones.geojson

Layer 3: 통신 불가 구역:
  type: geojson
  mode: demo
  visible: false
  url: /demo-layers/no-comms-zones.geojson
```

`visible=false`는 사용자가 UI에서 꺼둔 상태라는 뜻이다.

### 5.2 TAK Server DB

```text
DB name: cot
role:    martiuser
```

TAK Server 자체가 사용하는 DB다.

주요 역할은 다음과 같다.

- TAK Server 스키마 저장
- CoT 관련 데이터 저장
- mission, user, server 내부 데이터 저장

CloudTAK DB와 TAK Server DB는 별도다. CloudTAK은 TAK Server API와 CoT 연결을 통해 TAK Server와 통신한다.

## 6. 지도 렌더링 구조

CloudTAK Web은 MapLibre를 사용해 지도를 그린다.

지도 위에 보이는 것들은 크게 세 종류로 볼 수 있다.

```text
1. Basemap
   배경지도
   예: OpenStreetMap

2. Overlay / Layer
   지도 위에 얹는 데이터
   예: 위험 구역 polygon, 통신 불가 구역, 임무 레이어

3. Feature / CoT
   TAK 메시지 또는 사용자가 만든 점/선/면 객체
   예: 팀 위치, 마커, 경로, 특정 이벤트
```

현재 OpenStreetMap은 `basemaps` 테이블과 `profile_overlays` 테이블에 같이 등록되어 있다.

```text
basemaps:
  OpenStreetMap 원본 타일 URL 저장

profile_overlays:
  cloudtak 사용자가 OpenStreetMap을 켜고 있는지 저장
```

지도 표시 흐름은 다음과 같다.

```text
1. Web이 /api/profile/overlay 호출
2. API가 profile_overlays 목록 반환
3. Web이 각 overlay를 MapLibre source/layer로 변환
4. type=raster면 raster source/layer 생성
5. type=geojson이면 geojson source/layer 생성
6. 사용자가 토글하면 visible 값을 PATCH로 저장
```

## 7. 현재 추가한 데모 GeoJSON 레이어

현재 데모용 GeoJSON 파일은 다음 위치에 있다.

```text
api/web/public/demo-layers/boundary-zones.geojson
api/web/public/demo-layers/drone-risk-zones.geojson
api/web/public/demo-layers/no-comms-zones.geojson
```

빌드 결과물 쪽에도 같은 파일을 둔다.

```text
api/web/dist/demo-layers/boundary-zones.geojson
api/web/dist/demo-layers/drone-risk-zones.geojson
api/web/dist/demo-layers/no-comms-zones.geojson
```

Vite 개발 서버에서는 `api/web/public` 아래 파일이 다음처럼 접근된다.

```text
http://localhost:8081/demo-layers/boundary-zones.geojson
```

이 레이어들은 현재 `profile_overlays`에 다음처럼 등록되어 있다.

```text
type: geojson
mode: demo
url: /demo-layers/*.geojson
```

`mode=demo`는 CloudTAK 기본 기능에 있던 공식 모드는 아니다. 해커톤 데모를 위해 서버가 삭제하지 않고, 프론트가 GeoJSON source로 읽을 수 있게 넣은 로컬용 모드다.

## 8. 왜 웹 코드도 수정했는가

기본 CloudTAK 코드는 `type=geojson` overlay를 만들 때 빈 FeatureCollection source를 만든다.

원래 구조:

```text
geojson overlay 생성
  -> 빈 FeatureCollection source 생성
  -> mission 또는 내부 feature 동기화가 source.setData(...)로 데이터 주입
```

우리가 원하는 구조:

```text
geojson overlay 생성
  -> overlay.url에 있는 GeoJSON 파일을 source.data로 사용
```

그래서 다음 파일을 수정했다.

```text
api/web/src/base/overlay-class.ts
```

수정 내용은 두 가지다.

```text
1. type=geojson이고 overlay.url이 있으면 MapLibre source.data에 url을 넣음
2. mode=demo인 overlay는 on/off 저장 시 styles를 다시 PATCH하지 않음
```

두 번째 수정이 필요한 이유는 on/off 할 때 MapLibre style 객체가 서버 검증을 통과하지 못하고 다음 에러가 났기 때문이다.

```text
sources.5: missing required property "data"
```

`demo` 레이어는 스타일을 매번 저장할 필요가 없고 `visible`만 저장하면 되므로, PATCH에서 styles를 제외했다.

## 9. 동적 레이어로 확장하는 방법

현재 데모 레이어는 정적 GeoJSON 파일을 읽는다.

운영형 또는 해커톤 확장형으로 바꾸려면 다음 구조가 좋다.

```text
DB 테이블
  risk_zones
  drone_zones
  communication_outages

각 테이블
  id
  name
  status
  severity
  geometry geometry(MultiPolygon, 4326)
  starts_at
  ends_at
  updated_at

API
  GET /api/demo/layers/boundary-zones
  GET /api/demo/layers/drone-risk-zones
  GET /api/demo/layers/no-comms-zones

Web
  MapLibre geojson source가 위 API를 data URL로 사용
```

간단한 실시간 방식은 polling이다.

```text
1. Web이 5초마다 /api/demo/layers/drone-risk-zones 호출
2. 응답 GeoJSON을 source.setData(...)로 반영
3. DB 값이 바뀌면 지도도 몇 초 안에 갱신
```

조금 더 운영형에 가까운 방식은 WebSocket/SSE다.

```text
1. DB 또는 백엔드 이벤트로 특정 layer 변경 감지
2. CloudTAK API가 WebSocket으로 layer:update 이벤트 전송
3. Web이 해당 layer API를 다시 호출
4. source.setData(...)로 지도 갱신
```

CloudTAK은 이미 WebSocket과 이벤트 구조가 있으므로, 확장 가능하다.

## 10. 앞으로 구현할 때 추천 방향

해커톤 기준으로는 다음 순서가 가장 현실적이다.

```text
1. demo용 PostGIS 테이블 생성
2. Layer 1/2/3 데이터를 DB에 저장
3. /api/demo/layers/:layer API 추가
4. 현재 정적 GeoJSON url을 API url로 변경
5. 프론트에서 5초 polling 또는 refresh 버튼 추가
6. 필요하면 WebSocket 실시간 갱신으로 확장
```

처음부터 TAK Server mission 구조에 모두 얹는 것보다, CloudTAK DB + CloudTAK API + MapLibre overlay 구조로 시작하는 편이 빠르고 안정적이다.

TAK Server는 다음 용도로 유지하면 된다.

```text
TAK Server:
  TAK 클라이언트 연동
  CoT 메시지
  사용자 인증
  mission 공유

CloudTAK DB/API:
  해커톤 서비스 전용 레이어
  분석 결과
  위험 구역
  통신 구역
  드론 구역
  동적 시각화
```
