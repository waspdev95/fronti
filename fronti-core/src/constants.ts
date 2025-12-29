/**
 * Single source of truth for all constants
 */

// Core identifiers
export const NATIVE_HOST_NAME = 'com.fronti.core';
export const CHROME_EXTENSION_ID = 'jojjbmgmggenijlkhjeaiodfoggjcjgj';

// Directories
export const CONFIG_DIR = '.fronti';
export const NATIVE_HOST_DIR = 'native-host';

// Files
export const WORKSPACE_CONFIG_FILE = 'workspace.json';

// Version
export const NATIVE_HOST_VERSION = '1.0.10';

// Timeouts (ms)
export const COMMAND_TIMEOUT = 5000;

// Platform detection
export const IS_WINDOWS = process.platform === 'win32';
export const IS_MAC = process.platform === 'darwin';
export const IS_LINUX = process.platform === 'linux';

// Registry paths by platform
export const REGISTRY_PATHS = {
  win32: `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${NATIVE_HOST_NAME}`,
  darwin: 'Library/Application Support/Google/Chrome/NativeMessagingHosts',
  linux: '.config/google-chrome/NativeMessagingHosts'
} as const;

// Runtime files
export const RUNTIME_FILES = {
  windows: 'host.bat',
  unix: 'host.sh',
  script: 'host.js'
} as const;

// Error messages
export const ERRORS = {
  CLAUDE_NOT_FOUND: 'Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code',
  NODE_NOT_FOUND: 'Node.js not found. Please install Node.js 18+',
  NATIVE_HOST_FAILED: 'Native host installation failed'
} as const;

export type Platform = 'win32' | 'darwin' | 'linux';
