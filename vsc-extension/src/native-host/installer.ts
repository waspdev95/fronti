/**
 * Native messaging host installation
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { NATIVE_HOST_FILES } from '../constants';
import type { Platform } from '../types';
import { createManifest } from './manifest';
import { registerNativeHost } from './registry';

/**
 * Install and register native messaging host
 */
export function installNativeHost(context: vscode.ExtensionContext): void {
  try {
    const platform = os.platform() as Platform;
    const extensionPath = context.extensionPath;
    const nativeHostPath = path.join(extensionPath, 'native-host');

    const manifest = createManifest(nativeHostPath, platform);
    const manifestPath = path.join(nativeHostPath, 'manifest.json');

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    if (platform !== 'win32') {
      makeExecutable(nativeHostPath);
    }

    registerNativeHost(manifestPath, platform);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showWarningMessage(`Failed to install native host: ${errorMessage}`);
  }
}

/**
 * Make host scripts executable on Unix systems
 */
function makeExecutable(nativeHostPath: string): void {
  const hostScript = path.join(nativeHostPath, NATIVE_HOST_FILES.unix);
  const hostJs = path.join(nativeHostPath, NATIVE_HOST_FILES.script);

  if (fs.existsSync(hostScript)) {
    fs.chmodSync(hostScript, 0o755);
  }
  if (fs.existsSync(hostJs)) {
    fs.chmodSync(hostJs, 0o755);
  }
}
