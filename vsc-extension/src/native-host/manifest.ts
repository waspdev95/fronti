/**
 * Native messaging manifest creation
 */

import * as path from 'path';
import { NATIVE_HOST_NAME, NATIVE_HOST_FILES } from '../constants';
import type { NativeHostManifest, Platform } from '../types';

/**
 * Create native messaging manifest for the platform
 */
export function createManifest(nativeHostPath: string, platform: Platform): NativeHostManifest {
  const hostExecutable = platform === 'win32'
    ? path.join(nativeHostPath, NATIVE_HOST_FILES.windows)
    : path.join(nativeHostPath, NATIVE_HOST_FILES.unix);

  return {
    name: NATIVE_HOST_NAME,
    description: 'Fronti Native Host',
    path: hostExecutable,
    type: 'stdio',
    allowed_origins: [
      'chrome-extension://jojjbmgmggenijlkhjeaiodfoggjcjgj/'
    ]
  };
}
