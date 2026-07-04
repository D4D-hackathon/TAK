# GitHub 공유 및 배포 전략

이 문서는 현재 로컬 CloudTAK 해커톤 환경을 GitHub로 공유하고, 다른 사람이 재현할 수 있게 만드는 방법을 정리한다.

## 결론

현재 상태는 GitHub Pages처럼 정적 사이트로 배포할 수 없다.

CloudTAK은 다음이 필요하다.

- Node.js API 서버
- PostgreSQL + PostGIS
- TAK Server
- 인증서와 truststore
- WebSocket/CoT 연결

따라서 GitHub는 다음 용도로 쓰는 것이 맞다.

```text
1. 코드 공유
2. 설정/설치 문서 공유
3. 데모 데이터 seed 공유
4. GitHub Actions로 빌드/검증
5. 필요하면 Docker image 빌드
```

실제 실행 환경은 로컬 머신, VM, 클라우드 서버, 또는 해커톤 공용 서버에 따로 띄워야 한다.

## 현재 커밋해야 하는 것

현재 작업 중 GitHub에 올려야 하는 파일은 다음이다.

```text
architect.md
GITHUB_DEPLOY.md
docs/demo-overlays.seed.sql
api/web/public/demo-layers/*.geojson
api/web/src/base/overlay-class.ts
.gitignore
```

각 파일의 의미는 다음과 같다.

```text
architect.md:
  현재 프론트, API, TAK Server, DB, 레이어 구조 설명

GITHUB_DEPLOY.md:
  GitHub 공유/배포 전략

docs/demo-overlays.seed.sql:
  다른 사람이 같은 OpenStreetMap + 3개 데모 레이어를 DB에 넣기 위한 seed SQL

api/web/public/demo-layers/*.geojson:
  데모 레이어 원본 GeoJSON

api/web/src/base/overlay-class.ts:
  URL 기반 GeoJSON overlay와 demo layer on/off 저장 보강

.gitignore:
  외부 TAK Server/FreeTAKServer 소스 디렉터리 제외
```

## 커밋하면 안 되는 것

다음은 GitHub에 올리면 안 된다.

```text
api/.env
takserver-official/
freetakserver/
*.p12
*.key
*.jks
TAK 인증서 파일
로컬 DB dump
node_modules/
api/web/dist/
```

이유는 다음과 같다.

```text
api/.env:
  로컬 DB 접속정보와 secret 포함

takserver-official/:
  외부 공식 TAK Server 소스 clone
  빌드 결과와 인증서가 섞일 수 있음

freetakserver/:
  외부 소스 clone
  현재 CloudTAK 공식 인증서 API와 맞지 않아 사용하지 않음

인증서:
  private key, admin cert, truststore 포함 가능
```

## 추천 GitHub 운영 방식

공식 `dfpc-coe/CloudTAK`에 직접 push하지 않는다.

현재 remote는 다음이다.

```text
origin https://github.com/dfpc-coe/CloudTAK.git
```

따라서 아래 중 하나를 선택한다.

### 방법 A: 개인 fork 사용

1. GitHub에서 `dfpc-coe/CloudTAK` fork
2. 로컬 remote를 fork로 변경
3. 브랜치를 push

예시:

```bash
git remote rename origin upstream
git remote add origin https://github.com/<your-org-or-user>/CloudTAK.git
git checkout -b hackathon-cloudtak-demo
git add architect.md GITHUB_DEPLOY.md docs/demo-overlays.seed.sql .gitignore api/web/public/demo-layers api/web/src/base/overlay-class.ts
git commit -m "Add local hackathon CloudTAK demo layers"
git push -u origin hackathon-cloudtak-demo
```

### 방법 B: 새 저장소 사용

CloudTAK 전체 fork가 부담되면 새 repo를 만들고, 현재 폴더를 그대로 push한다.

다만 CloudTAK 원본 전체가 포함되므로 fork 방식이 더 자연스럽다.

## 다른 사람이 클론 후 재현하는 흐름

새 사람이 repo를 받아서 실행하려면 다음 순서가 필요하다.

```text
1. CloudTAK repo clone
2. Node.js 24 설치
3. PostgreSQL + PostGIS 설치
4. CloudTAK DB 생성
5. api/.env 생성
6. npm install
7. TAK Server 공식 소스 clone 및 빌드
8. TAK Server 인증서 생성
9. TAK Server DB 생성 및 schema manager 실행
10. TAK Server config/messaging/api 실행
11. CloudTAK API 실행
12. CloudTAK Web 실행
13. CloudTAK configure 수행
14. demo-overlays.seed.sql 실행
```

현재 데모 레이어 seed 실행 명령은 다음이다.

```bash
cd /Users/jeongmin-yong/CloudTAK
psql 'postgres://cloudtak:cloudtak@localhost:5432/tak_ps_etl' -f docs/demo-overlays.seed.sql
```

## 로컬 실행 명령 요약

CloudTAK API:

```bash
cd /Users/jeongmin-yong/CloudTAK/api
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev
```

CloudTAK Web:

```bash
cd /Users/jeongmin-yong/CloudTAK/api/web
npm run serve
```

TAK Server는 터미널 3개에서 실행한다.

```text
config
messaging
api
```

자세한 TAK Server 설정과 실행 명령은 `architect.md`와 이전 작업 로그를 참고한다. 운영용으로는 별도 문서 또는 스크립트로 분리하는 것이 좋다.

## 배포 옵션

### 1. 해커톤 당일 로컬 실행

가장 안전하다.

```text
장점:
  외부 방화벽/도메인/TLS 설정 최소화
  TAK Server self-signed cert 문제를 로컬에서 통제 가능
  비용 없음

단점:
  발표자는 같은 노트북/네트워크에서 실행해야 함
```

### 2. 한 대의 VM에 배포

CloudTAK API, Web, PostgreSQL, TAK Server를 한 VM에 올린다.

```text
장점:
  팀원이 같은 URL로 접근 가능
  발표 환경 통일 가능

단점:
  TAK Server 포트, TLS 인증서, 방화벽 설정 필요
  공개 인터넷에 노출하면 보안 설정 필요
```

필요 포트 예시:

```text
80/443:
  CloudTAK Web/API reverse proxy

8089:
  TAK CoT TLS

8443:
  TAK Marti API

8446:
  TAK cert/WebTAK API
```

공개 배포에서는 self-signed 우회를 쓰지 말고 정상 TLS 인증서를 써야 한다.

### 3. Docker Compose로 묶기

장기적으로는 가장 재현성이 좋다.

구성 예시:

```text
cloudtak-api
cloudtak-web
postgres-postgis
takserver-config
takserver-messaging
takserver-api
```

다만 공식 TAK Server 빌드와 인증서 생성 절차가 복잡하므로, 지금 당장 해커톤 하루 용도로는 로컬 실행이나 VM 수동 구성이 더 빠르다.

## GitHub Actions에서 할 수 있는 것

GitHub Actions는 다음 정도까지 맡기는 것이 적절하다.

```text
1. npm install
2. api/web build
3. TypeScript/ESLint 검사
4. Docker image build
5. release artifact 생성
```

TAK Server 전체 실행 검증은 인증서와 PostGIS, 여러 Java 프로세스가 필요해서 CI에 바로 넣기 어렵다.

## 현재 기준 추천

지금 해커톤 목적이면 다음 방식이 가장 현실적이다.

```text
GitHub:
  CloudTAK 코드 변경분
  architect.md
  GITHUB_DEPLOY.md
  demo-overlays.seed.sql
  demo GeoJSON 파일

실행:
  발표 노트북 또는 공용 VM에서 수동 실행

데이터:
  psql -f docs/demo-overlays.seed.sql

TAK Server:
  GitHub에 포함하지 않고 문서대로 clone/build
```

이렇게 하면 비밀 인증서나 빌드 산출물을 GitHub에 올리지 않으면서도, 다른 사람이 같은 환경을 재현할 수 있다.
