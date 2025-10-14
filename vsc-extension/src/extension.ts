/**
 * Fronti VS Code Extension
 *
 * Main extension entry point that coordinates workspace management,
 * native host installation, and webview providers.
 */

import * as vscode from 'vscode';
import * as os from 'os';
import { ChromeExtensionProvider } from './chromeExtensionView';
import { saveWorkspaceInfo, cleanupWorkspaceInfo } from './utils/workspace';
import { installNativeHost } from './native-host/installer';
import { unregisterNativeHost } from './native-host/registry';
import type { Platform } from './types';

/**
 * Extension activation
 * Called when extension is first activated
 */
export function activate(context: vscode.ExtensionContext): void {
  // Install native messaging host
  installNativeHost(context);

  // Save initial workspace info
  saveWorkspaceInfo();

  // Register webview provider for getting started view
  const chromeExtensionProvider = new ChromeExtensionProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ChromeExtensionProvider.viewType,
      chromeExtensionProvider
    )
  );

  // Watch for workspace changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      saveWorkspaceInfo();
    })
  );

  // Watch for active editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      saveWorkspaceInfo();
    })
  );
}

/**
 * Extension deactivation
 * Called when extension is deactivated
 */
export function deactivate(): void {
  try {
    cleanupWorkspaceInfo();
    unregisterNativeHost(os.platform() as Platform);
  } catch {
    // Silently fail - extension is deactivating
  }
}
