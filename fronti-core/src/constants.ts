export const NATIVE_HOST_NAME = 'com.fronti.core';
export const CONFIG_DIR_NAME = '.fronti';
export const WORKSPACE_CONFIG_FILE = 'workspace.json';
export const NATIVE_HOST_DIR_NAME = 'native-host';

// Version for smart manifest management
export const NATIVE_HOST_VERSION = '1.0.7';

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
