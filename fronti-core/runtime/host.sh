#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_BIN="C:\Program Files\nodejs\node.exe"
if [ ! -x "$NODE_BIN" ]; then
  NODE_BIN="$(command -v node || true)"
fi
if [ -z "$NODE_BIN" ]; then
  echo "Fronti: Node.js not found in PATH" >&2
  exit 1
fi
exec "$NODE_BIN" "${DIR}/host.js"
