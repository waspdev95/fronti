/**
 * Platform-specific native host registration
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execSync } from 'child_process';
import { NATIVE_HOST_NAME, REGISTRY_PATHS } from '../constants';
import type { Platform } from '../types';

/**
 * Register native host with Chrome browser
 */
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

/**
 * Unregister native host from Chrome browser
 */
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
    // Silently fail
  }
}

/**
 * Windows registration via registry
 */
function registerWindows(manifestPath: string): void {
  const regPath = REGISTRY_PATHS.windows;
  execSync(`reg add "${regPath}" /ve /t REG_SZ /d "${manifestPath}" /f`, {
    encoding: 'utf8',
    timeout: 5000,
    windowsHide: true
  });
}

/**
 * macOS registration via file copy
 */
function registerMac(manifestPath: string): void {
  const targetDir = path.join(os.homedir(), REGISTRY_PATHS.darwin);
  ensureDirectoryExists(targetDir);

  const targetPath = path.join(targetDir, `${NATIVE_HOST_NAME}.json`);
  fs.copyFileSync(manifestPath, targetPath);
}

/**
 * Linux registration via file copy
 */
function registerLinux(manifestPath: string): void {
  const targetDir = path.join(os.homedir(), REGISTRY_PATHS.linux);
  ensureDirectoryExists(targetDir);

  const targetPath = path.join(targetDir, `${NATIVE_HOST_NAME}.json`);
  fs.copyFileSync(manifestPath, targetPath);
}

/**
 * Windows unregistration
 */
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

/**
 * macOS unregistration
 */
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

/**
 * Linux unregistration
 */
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

/**
 * Ensure directory exists, create if not
 */
function ensureDirectoryExists(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
