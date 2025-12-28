import * as fs from 'fs';
import * as path from 'path';
import type { Platform } from './types';

const HOST_JS_CONTENT = `#!/usr/bin/env node
const { runNativeHost } = require('../dist/index.js');

runNativeHost();
`;

function buildHostBat(nodePath: string): string {
  const normalizedPath = nodePath.replace(/"/g, '');
  return `@echo off
set "NODE_BIN=${normalizedPath}"
if not exist "%NODE_BIN%" set "NODE_BIN=node"
"%NODE_BIN%" "%~dp0host.js" %*
`;
}

function buildHostSh(nodePath: string): string {
  const normalizedPath = nodePath.replace(/"/g, '\\"');
  return `#!/usr/bin/env bash
DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
NODE_BIN="${normalizedPath}"
if [ ! -x "$NODE_BIN" ]; then
  NODE_BIN="$(command -v node || true)"
fi
if [ -z "$NODE_BIN" ]; then
  echo "Fronti: Node.js not found in PATH" >&2
  exit 1
fi
exec "$NODE_BIN" "\${DIR}/host.js"
`;
}

export function ensureRuntimeFiles(targetDir: string, platform: Platform): void {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const nodePath = process.execPath;

  const hostJsPath = path.join(targetDir, 'host.js');
  const hostBatPath = path.join(targetDir, 'host.bat');
  const hostShPath = path.join(targetDir, 'host.sh');

  fs.writeFileSync(hostJsPath, HOST_JS_CONTENT, { encoding: 'utf8' });
  fs.writeFileSync(hostBatPath, buildHostBat(nodePath), { encoding: 'utf8' });
  fs.writeFileSync(hostShPath, buildHostSh(nodePath), { encoding: 'utf8' });

  try {
    fs.chmodSync(hostJsPath, 0o755);
  } catch {
    // Ignore
  }

  if (platform !== 'win32') {
    try {
      fs.chmodSync(hostShPath, 0o755);
    } catch {
      // Ignore
    }
  }
}
