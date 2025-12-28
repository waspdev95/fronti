import * as path from 'path';
import { NATIVE_HOST_NAME, NATIVE_HOST_FILES } from './constants';
import type { NativeHostManifest, Platform } from './types';

export function createManifest(
  nativeHostPath: string,
  platform: Platform,
  allowedExtensionIds?: string[]
): NativeHostManifest {
  const hostExecutable =
    platform === 'win32'
      ? path.join(nativeHostPath, NATIVE_HOST_FILES.windows)
      : path.join(nativeHostPath, NATIVE_HOST_FILES.unix);

  const extensionIds =
    allowedExtensionIds && allowedExtensionIds.length > 0
      ? allowedExtensionIds
      : ['jojjbmgmggenijlkhjeaiodfoggjcjgj'];

  return {
    name: NATIVE_HOST_NAME,
    description: 'Fronti Core - Bridge component for browser, VS Code, and Claude Code',
    path: hostExecutable,
    type: 'stdio',
    allowed_origins: extensionIds.map((id) => `chrome-extension://${id}/`)
  };
}
