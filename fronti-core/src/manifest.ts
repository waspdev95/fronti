import * as path from 'path';
import { NATIVE_HOST_NAME, RUNTIME_FILES, NATIVE_HOST_VERSION, CHROME_EXTENSION_ID } from './constants';
import type { NativeHostManifest, Platform } from './types';

export function createManifest(
  nativeHostPath: string,
  platform: Platform,
  allowedExtensionIds?: string[]
): NativeHostManifest {
  const hostExecutable = path.join(
    nativeHostPath,
    platform === 'win32' ? RUNTIME_FILES.windows : RUNTIME_FILES.unix
  );

  const extensionIds = allowedExtensionIds?.length ? allowedExtensionIds : [CHROME_EXTENSION_ID];

  return {
    name: NATIVE_HOST_NAME,
    description: 'Fronti Core - Bridge component for browser, VS Code, and Claude Code',
    path: hostExecutable,
    type: 'stdio',
    allowed_origins: extensionIds.map((id) => `chrome-extension://${id}/`),
    version: NATIVE_HOST_VERSION
  };
}
