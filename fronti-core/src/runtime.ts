import * as fs from 'fs';
import * as path from 'path';
import type { Platform } from './types';

/**
 * Host.js content - uses relative path to dist folder
 * which will be copied alongside host.js
 */
const HOST_JS_CONTENT = `#!/usr/bin/env node
const { runNativeHost } = require('./dist/index.js');

runNativeHost();
`;

/**
 * Windows batch file - simple and reliable
 */
function buildHostBat(): string {
  return `@echo off
node "%~dp0host.js" %*
`;
}

/**
 * Unix shell script - dynamically finds Node.js
 * Priority: 1) PATH lookup, 2) Common install paths
 */
function buildHostSh(): string {
  return `#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"

# Try to find Node.js dynamically
find_node() {
  # First try PATH
  if command -v node >/dev/null 2>&1; then
    command -v node
    return 0
  fi

  # Try common installation paths
  local paths=(
    "/usr/local/bin/node"
    "/usr/bin/node"
    "$HOME/.nvm/current/bin/node"
    "$HOME/.volta/bin/node"
    "$HOME/.asdf/shims/node"
    "/opt/homebrew/bin/node"
  )

  for p in "\${paths[@]}"; do
    if [ -x "$p" ]; then
      echo "$p"
      return 0
    fi
  done

  # Try nvm if available
  if [ -f "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh" >/dev/null 2>&1
    if command -v node >/dev/null 2>&1; then
      command -v node
      return 0
    fi
  fi

  return 1
}

NODE_BIN="$(find_node)" || {
  echo "Fronti: Node.js not found. Please install Node.js 18+" >&2
  exit 1
}

exec "$NODE_BIN" "\${DIR}/host.js"
`;
}

/**
 * Copy the dist folder to target directory
 */
function copyDistFolder(targetDir: string): void {
  const sourceDistDir = path.resolve(__dirname);
  const targetDistDir = path.join(targetDir, 'dist');

  if (!fs.existsSync(targetDistDir)) {
    fs.mkdirSync(targetDistDir, { recursive: true });
  }

  // Copy all .js files from source dist to target dist
  const files = fs.readdirSync(sourceDistDir);
  for (const file of files) {
    if (file.endsWith('.js') || file.endsWith('.json')) {
      const sourcePath = path.join(sourceDistDir, file);
      const targetPath = path.join(targetDistDir, file);

      // Only copy files, not directories
      if (fs.statSync(sourcePath).isFile()) {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  }
}

export function ensureRuntimeFiles(targetDir: string, platform: Platform): void {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const hostJsPath = path.join(targetDir, 'host.js');
  const hostBatPath = path.join(targetDir, 'host.bat');
  const hostShPath = path.join(targetDir, 'host.sh');

  // Write host files with dynamic Node.js resolution
  fs.writeFileSync(hostJsPath, HOST_JS_CONTENT, { encoding: 'utf8' });
  fs.writeFileSync(hostBatPath, buildHostBat(), { encoding: 'utf8' });
  fs.writeFileSync(hostShPath, buildHostSh(), { encoding: 'utf8' });

  // Copy dist folder so host.js can require it
  copyDistFolder(targetDir);

  // Set executable permissions
  try {
    fs.chmodSync(hostJsPath, 0o755);
  } catch {
    // Ignore permission errors on Windows
  }

  if (platform !== 'win32') {
    try {
      fs.chmodSync(hostShPath, 0o755);
    } catch {
      // Ignore
    }
  }
}
