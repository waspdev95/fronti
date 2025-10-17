/**
 * Fronti VS Code Extension
 *
 * Main entry point that coordinates native host installation and webview providers.
 */

import * as vscode from 'vscode';
import { ChromeExtensionProvider } from './chromeExtensionView';
import { ensureNativeHostInstalled } from './nativeHostInstaller';

/**
 * Extension activation
 * Called when extension is first activated
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Register webview provider for getting started view
  const chromeExtensionProvider = new ChromeExtensionProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ChromeExtensionProvider.viewType,
      chromeExtensionProvider
    )
  );

  await ensureNativeHostInstalled();
}

/**
 * Extension deactivation
 * Called when extension is deactivated
 */
export function deactivate(): void {
  // No-op: native host remains installed so CLI keeps working even if the extension unloads.
}
