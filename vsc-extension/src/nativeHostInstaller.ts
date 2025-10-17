import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  getDefaultRuntimeDir,
  getRegisteredManifestPath,
  installNativeHostRuntime
} from '@fronti/core';
import type { Platform } from '@fronti/core';

const ALLOWED_EXTENSION_IDS = [
  'fjidllehmalodkbffegpihbcfolplneg',
  'jojjbmgmggenijlkhjeaiodfoggjcjgj'
];

function manifestLooksValid(manifestPath: string | null): boolean {
  if (!manifestPath) {
    return false;
  }

  try {
    return fs.existsSync(manifestPath);
  } catch {
    return false;
  }
}

export async function ensureNativeHostInstalled(): Promise<void> {
  const platform = process.platform as Platform;

  try {
    const existingManifest = getRegisteredManifestPath(platform);
    if (manifestLooksValid(existingManifest)) {
      return;
    }
  } catch (error) {
    console.error('[Fronti] Failed to read native host registration:', error);
  }

  try {
    const runtimeDir = getDefaultRuntimeDir();
    installNativeHostRuntime({
      nativeHostPath: runtimeDir,
      platform,
      allowedExtensionIds: ALLOWED_EXTENSION_IDS
    });
    console.log('[Fronti] Native host installed at', path.join(runtimeDir, 'manifest.json'));
  } catch (error) {
    console.error('[Fronti] Native host installation failed:', error);
    void vscode.window.showErrorMessage(
      'Fronti: Core component could not be installed automatically. Run "fronti-core install" from a terminal.',
      { modal: false }
    );
  }
}
