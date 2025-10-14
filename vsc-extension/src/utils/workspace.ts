/**
 * Workspace configuration management
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { CONFIG_DIR_NAME, WORKSPACE_CONFIG_FILE } from '../constants';
import type { WorkspaceConfig } from '../types';

/**
 * Get the current workspace or active document path
 */
function getCurrentPath(): string | null {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const activeDocument = vscode.window.activeTextEditor?.document;

  if (workspaceFolder) {
    return workspaceFolder.uri.fsPath;
  } else if (activeDocument && !activeDocument.isUntitled) {
    return path.dirname(activeDocument.uri.fsPath);
  }

  return null;
}

/**
 * Get config file paths
 */
function getConfigPaths(): { dir: string; file: string } {
  const configDir = path.join(os.homedir(), CONFIG_DIR_NAME);
  const configFile = path.join(configDir, WORKSPACE_CONFIG_FILE);
  return { dir: configDir, file: configFile };
}

/**
 * Save workspace information to config file
 * Allows native host to access the workspace path
 */
export function saveWorkspaceInfo(): void {
  const projectPath = getCurrentPath();
  const { dir, file } = getConfigPaths();

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const config: WorkspaceConfig = {
      projectPath,
      timestamp: Date.now()
    };

    fs.writeFileSync(file, JSON.stringify(config, null, 2));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`Failed to save workspace info: ${errorMessage}`);
  }
}

/**
 * Clean up workspace config file
 */
export function cleanupWorkspaceInfo(): void {
  const { file } = getConfigPaths();

  try {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  } catch {
    // Silently fail - extension is deactivating
  }
}
