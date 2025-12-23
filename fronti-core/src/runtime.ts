import * as fs from 'fs';
import * as path from 'path';
import type { Platform } from './types';

const HOST_JS_CONTENT = `#!/usr/bin/env node
const { runNativeHost } = require('@fronti/core');

runNativeHost();
`;

const HOST_BAT_CONTENT = `@echo off
node "%~dp0host.js" %*
`;

const HOST_SH_CONTENT = `#!/usr/bin/env bash
DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
node "\${DIR}/host.js"
`;

export function ensureRuntimeFiles(targetDir: string, platform: Platform): void {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const hostJsPath = path.join(targetDir, 'host.js');
  const hostBatPath = path.join(targetDir, 'host.bat');
  const hostShPath = path.join(targetDir, 'host.sh');

  fs.writeFileSync(hostJsPath, HOST_JS_CONTENT, { encoding: 'utf8' });
  fs.writeFileSync(hostBatPath, HOST_BAT_CONTENT, { encoding: 'utf8' });
  fs.writeFileSync(hostShPath, HOST_SH_CONTENT, { encoding: 'utf8' });

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
