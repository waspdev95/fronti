import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execSync } from 'child_process';
import { NATIVE_HOST_NAME, REGISTRY_PATHS } from './constants';
import type { Platform } from './types';

export function registerNativeHost(manifestPath: string, platform: Platform): void {
  switch (platform) {
    case 'win32':
      registerWindows(manifestPath);
      break;
    case 'darwin':
      registerMac(manifestPath);
      break;
    default:
      registerLinux(manifestPath);
      break;
  }
}

export function unregisterNativeHost(platform: Platform): void {
  try {
    switch (platform) {
      case 'win32':
        unregisterWindows();
        break;
      case 'darwin':
        unregisterMac();
        break;
      default:
        unregisterLinux();
        break;
    }
  } catch {
    // Ignore errors during cleanup
  }
}

function registerWindows(manifestPath: string): void {
  const regPath = REGISTRY_PATHS.windows;
  execSync(`reg add "${regPath}" /ve /t REG_SZ /d "${manifestPath}" /f`, {
    encoding: 'utf8',
    timeout: 5000,
    windowsHide: true
  });
}

function registerMac(manifestPath: string): void {
  const targetDir = path.join(os.homedir(), REGISTRY_PATHS.darwin);
  ensureDirectoryExists(targetDir);

  const targetPath = path.join(targetDir, `${NATIVE_HOST_NAME}.json`);
  fs.copyFileSync(manifestPath, targetPath);
}

function registerLinux(manifestPath: string): void {
  const targetDir = path.join(os.homedir(), REGISTRY_PATHS.linux);
  ensureDirectoryExists(targetDir);

  const targetPath = path.join(targetDir, `${NATIVE_HOST_NAME}.json`);
  fs.copyFileSync(manifestPath, targetPath);
}

function unregisterWindows(): void {
  const regPath = REGISTRY_PATHS.windows;
  try {
    execSync(`reg delete "${regPath}" /f`, {
      timeout: 2000,
      windowsHide: true,
      stdio: 'ignore'
    });
  } catch {
    // Ignore if already removed
  }
}

function unregisterMac(): void {
  const manifestPath = path.join(
    os.homedir(),
    REGISTRY_PATHS.darwin,
    `${NATIVE_HOST_NAME}.json`
  );
  try {
    fs.unlinkSync(manifestPath);
  } catch {
    // Ignore if already removed
  }
}

function unregisterLinux(): void {
  const manifestPath = path.join(
    os.homedir(),
    REGISTRY_PATHS.linux,
    `${NATIVE_HOST_NAME}.json`
  );
  try {
    fs.unlinkSync(manifestPath);
  } catch {
    // Ignore if already removed
  }
}

function ensureDirectoryExists(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
