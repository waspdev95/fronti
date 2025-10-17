export interface NativeHostManifest {
  name: string;
  description: string;
  path: string;
  type: 'stdio';
  allowed_origins: string[];
}

export type Platform = 'win32' | 'darwin' | 'linux';

export interface InstallOptions {
  nativeHostPath: string;
  platform: Platform;
  allowedExtensionIds?: string[];
}

export interface InstallResult {
  manifestPath: string;
  usedExisting: boolean;
}
