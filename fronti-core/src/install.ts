import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { createManifest } from './manifest';
import { registerNativeHost, unregisterNativeHost } from './registry';
import { ensureRuntimeFiles } from './runtime';
import { NATIVE_HOST_NAME, REGISTRY_PATHS } from './constants';
import type { InstallOptions, InstallResult, Platform } from './types';

export function getDefaultRuntimeDir(): string {
  const packageRoot = path.resolve(__dirname, '..');
  return path.join(packageRoot, 'runtime');
}

export function installNativeHostRuntime(options: InstallOptions): InstallResult {
  const { nativeHostPath, platform, allowedExtensionIds } = options;

  ensureRuntimeFiles(nativeHostPath, platform);

  const manifestPath = path.join(nativeHostPath, 'manifest.json');
  const manifest = createManifest(nativeHostPath, platform, allowedExtensionIds);

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), { encoding: 'utf8' });

  registerNativeHost(manifestPath, platform);

  return {
    manifestPath,
    usedExisting: false
  };
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
