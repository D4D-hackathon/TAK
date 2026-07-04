#!/usr/bin/env bash

set -euo pipefail

PROFILE="${1:-}"

if [[ "$PROFILE" != "config" && "$PROFILE" != "messaging" && "$PROFILE" != "api" ]]; then
    echo "usage: $0 {config|messaging|api}" >&2
    exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TAK_DIR="${TAK_DIR:-$ROOT_DIR/takserver-official/src/takserver-core/example}"
TAK_WAR="${TAK_WAR:-}"
if [[ -z "$TAK_WAR" ]]; then
    TAK_WAR="$(ls -1 "$TAK_DIR"/../build/libs/takserver-core-*.war 2>/dev/null | sort -V | tail -n 1)"
fi

if [[ ! -d "$TAK_DIR" ]]; then
    echo "TAK Server example directory not found: $TAK_DIR" >&2
    echo "Expected TAK Server source at: $ROOT_DIR/takserver-official" >&2
    exit 1
fi

if [[ ! -f "$TAK_WAR" ]]; then
    echo "TAK Server WAR not found: $TAK_WAR" >&2
    echo "Build it first with: cd $ROOT_DIR/takserver-official/src/takserver-core && ../gradlew clean bootWar bootJar" >&2
    exit 1
fi

cd "$TAK_DIR"
unset JDK_JAVA_OPTIONS

EXTRA_ARGS=()
if [[ "$PROFILE" == "api" ]]; then
    EXTRA_ARGS+=("-Dkeystore.pkcs12.legacy")
fi

exec java -Xmx2g \
    --add-opens=java.base/sun.security.pkcs=ALL-UNNAMED \
    --add-opens=java.base/sun.security.pkcs10=ALL-UNNAMED \
    --add-opens=java.base/sun.security.util=ALL-UNNAMED \
    --add-opens=java.base/sun.security.x509=ALL-UNNAMED \
    --add-opens=java.base/sun.security.tools.keytool=ALL-UNNAMED \
    --add-opens=java.base/jdk.internal.misc=ALL-UNNAMED \
    --add-opens=java.base/sun.nio.ch=ALL-UNNAMED \
    --add-opens=java.base/java.lang=ALL-UNNAMED \
    --add-opens=java.base/java.lang.reflect=ALL-UNNAMED \
    --add-opens=java.base/java.security=ALL-UNNAMED \
    --add-opens=java.base/javax.net.ssl=ALL-UNNAMED \
    -Dloader.path=WEB-INF/lib-provided,WEB-INF/lib,WEB-INF/classes,file:lib/ \
    -Dspring.profiles.active="${PROFILE},duplicatelogs" \
    "${EXTRA_ARGS[@]}" \
    -jar "$TAK_WAR"
