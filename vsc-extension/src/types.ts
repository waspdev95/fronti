/**
 * Type definitions for the extension
 */

/**
 * Workspace configuration stored in user's home directory
 */
export interface WorkspaceConfig {
  projectPath: string | null;
  timestamp: number;
}

/**
 * Native messaging host manifest
 */
export interface NativeHostManifest {
  name: string;
  description: string;
  path: string;
  type: string;
  allowed_origins: string[];
}

/**
 * Supported platforms
 */
export type Platform = 'win32' | 'darwin' | 'linux';
