/**
 * Application constants
 */

export const NATIVE_HOST_NAME = 'com.ai_visual_editor.host';
export const CONFIG_DIR_NAME = '.ai-visual-editor';
export const WORKSPACE_CONFIG_FILE = 'workspace.json';

export const REGISTRY_PATHS = {
  windows: `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${NATIVE_HOST_NAME}`,
  darwin: 'Library/Application Support/Google/Chrome/NativeMessagingHosts',
  linux: '.config/google-chrome/NativeMessagingHosts'
} as const;

export const NATIVE_HOST_FILES = {
  windows: 'host.bat',
  unix: 'host.sh',
  script: 'host.js'
} as const;
