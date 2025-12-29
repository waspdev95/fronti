import * as vscode from 'vscode';
import {
  getDefaultRuntimeDir,
  smartInstall,
  isInstallNeeded,
  NATIVE_HOST_VERSION
} from '@fronti/core';
import type { Platform } from '@fronti/core';

const ALLOWED_EXTENSION_IDS = ['jojjbmgmggenijlkhjeaiodfoggjcjgj'];

/**
 * Ensures the native host is installed.
 * Uses smart installation that:
 * - Checks if already installed and up-to-date
 * - Only installs/updates if needed
 * - Uses a fixed system location (~/.fronti/native-host)
 */
export async function ensureNativeHostInstalled(): Promise<void> {
  const platform = process.platform as Platform;

  try {
    // Check if installation is needed
    if (!isInstallNeeded(platform)) {
      console.log(`[Fronti] Native host already installed (v${NATIVE_HOST_VERSION})`);
      return;
    }

    // Install or update
    const runtimeDir = getDefaultRuntimeDir();
    const result = smartInstall({
      nativeHostPath: runtimeDir,
      platform,
      allowedExtensionIds: ALLOWED_EXTENSION_IDS
    });

    if (result.usedExisting) {
      console.log(`[Fronti] Native host verified (v${NATIVE_HOST_VERSION})`);
    } else {
      console.log(`[Fronti] Native host installed (v${NATIVE_HOST_VERSION})`);
      console.log(`[Fronti] Manifest: ${result.manifestPath}`);
    }
  } catch (error) {
    console.error('[Fronti] Native host installation failed:', error);
    void vscode.window.showErrorMessage(
      'Fronti: Core component could not be installed automatically. Run "npm install -g @fronti/core" from a terminal.',
      { modal: false }
    );
  }
}
