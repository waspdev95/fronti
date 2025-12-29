import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { createManifest } from './manifest';
import { registerNativeHost, unregisterNativeHost } from './registry';
import { ensureRuntimeFiles } from './runtime';
import { NATIVE_HOST_NAME, REGISTRY_PATHS, CONFIG_DIR_NAME, NATIVE_HOST_DIR_NAME, NATIVE_HOST_VERSION } from './constants';
import type { InstallOptions, InstallResult, Platform } from './types';

/**
 * Returns a fixed system-wide runtime directory that works for both
 * npm global install and VSCode extension installation.
 * Location: ~/.fronti/native-host/
 */
export function getDefaultRuntimeDir(): string {
  return path.join(os.homedir(), CONFIG_DIR_NAME, NATIVE_HOST_DIR_NAME);
}

/**
 * Read the version from an existing manifest
 */
function readManifestVersion(manifestPath: string): string | null {
  try {
    const data = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(data);
    return manifest?.version ?? null;
  } catch {
    return null;
  }
}

/**
 * Check if the runtime files (host.sh/host.bat, host.js) exist and are valid
 */
function runtimeFilesExist(runtimeDir: string, platform: Platform): boolean {
  try {
    const hostJs = path.join(runtimeDir, 'host.js');
    const hostScript = platform === 'win32'
      ? path.join(runtimeDir, 'host.bat')
      : path.join(runtimeDir, 'host.sh');

    return fs.existsSync(hostJs) && fs.existsSync(hostScript);
  } catch {
    return false;
  }
}

/**
 * Compare semantic versions. Returns:
 * - positive if v1 > v2
 * - negative if v1 < v2
 * - 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 !== p2) return p1 - p2;
  }
  return 0;
}

/**
 * Check if installation is needed based on:
 * 1. Manifest doesn't exist
 * 2. Runtime files don't exist
 * 3. Current version is newer than installed version
 */
export function isInstallNeeded(platform: Platform): boolean {
  const manifestPath = getRegisteredManifestPath(platform);

  // No manifest registered - need to install
  if (!manifestPath) {
    return true;
  }

  // Check if manifest file actually exists
  if (!fs.existsSync(manifestPath)) {
    return true;
  }

  // Read manifest to get runtime path
  const executablePath = readManifestExecutable(manifestPath);
  if (!executablePath) {
    return true;
  }

  // Check if runtime directory exists (parent of executable)
  const runtimeDir = path.dirname(executablePath);
  if (!runtimeFilesExist(runtimeDir, platform)) {
    return true;
  }

  // Check version - install if current version is newer
  const installedVersion = readManifestVersion(manifestPath);
  if (!installedVersion) {
    return true;
  }

  return compareVersions(NATIVE_HOST_VERSION, installedVersion) > 0;
}

/**
 * Install or update the native host runtime.
 * Uses smart version checking to avoid unnecessary overwrites.
 */
export function installNativeHostRuntime(options: InstallOptions): InstallResult {
  const { nativeHostPath, platform, allowedExtensionIds } = options;

  // Create runtime directory and files
  ensureRuntimeFiles(nativeHostPath, platform);

  // Create manifest with version
  const manifestPath = path.join(nativeHostPath, 'manifest.json');
  const manifest = createManifest(nativeHostPath, platform, allowedExtensionIds);

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), { encoding: 'utf8' });

  // Register with Chrome
  registerNativeHost(manifestPath, platform);

  return {
    manifestPath,
    usedExisting: false
  };
}

/**
 * Smart install - only installs if needed
 */
export function smartInstall(options: InstallOptions): InstallResult {
  const { platform } = options;

  if (!isInstallNeeded(platform)) {
    const existingManifest = getRegisteredManifestPath(platform);
    return {
      manifestPath: existingManifest!,
      usedExisting: true
    };
  }

  return installNativeHostRuntime(options);
}

export function uninstallNativeHost(platform: Platform): void {
  unregisterNativeHost(platform);
}

export function getRegisteredManifestPath(platform: Platform): string | null {
  try {
    switch (platform) {
      case 'win32': {
        const output = execSync(`reg query "${REGISTRY_PATHS.windows}" /ve`, {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore']
        });
        const match = output.match(/REG_SZ\s+(.*)/);
        return match ? match[1].trim() : null;
      }
      case 'darwin': {
        const manifestPath = path.join(
          os.homedir(),
          REGISTRY_PATHS.darwin,
          `${NATIVE_HOST_NAME}.json`
        );
        return fs.existsSync(manifestPath) ? manifestPath : null;
      }
      default: {
        const manifestPath = path.join(
          os.homedir(),
          REGISTRY_PATHS.linux,
          `${NATIVE_HOST_NAME}.json`
        );
        return fs.existsSync(manifestPath) ? manifestPath : null;
      }
    }
  } catch {
    return null;
  }
}

export function readManifestExecutable(manifestPath: string): string | null {
  try {
    const data = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(data);
    return manifest?.path ?? null;
  } catch {
    return null;
  }
}
