/**
 * Utility functions for checking native host and dependencies
 */

interface CheckResult {
  success: boolean;
  installed: boolean;
  error?: string;
  version?: string;
}

interface CheckAllResult {
  vscExtension: CheckResult;
  claudeCode: CheckResult;
  projectPath?: string | null;
}

/**
 * Check everything at once (faster)
 */
export async function checkAll(): Promise<CheckAllResult> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { type: 'CHECK_ALL' },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({
              vscExtension: {
                success: false,
                installed: false,
                error: chrome.runtime.lastError.message
              },
              claudeCode: {
                success: false,
                installed: false,
                error: 'Cannot check - native host not available'
              }
            });
          } else {
            resolve(response);
          }
        }
      );
    } catch (error) {
      resolve({
        vscExtension: {
          success: false,
          installed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        claudeCode: {
          success: false,
          installed: false,
          error: 'Cannot check'
        }
      });
    }
  });
}

/**
 * Check if native host (VS Code extension) is installed
 */
export async function checkNativeHost(): Promise<CheckResult> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { type: 'CHECK_NATIVE_HOST' },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              installed: false,
              error: chrome.runtime.lastError.message
            });
          } else {
            resolve(response);
          }
        }
      );
    } catch (error) {
      resolve({
        success: false,
        installed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

/**
 * Check if Claude Code CLI is installed
 */
export async function checkClaudeCode(): Promise<CheckResult> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { type: 'CHECK_CLAUDE_CODE' },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              installed: false,
              error: chrome.runtime.lastError.message
            });
          } else {
            resolve(response);
          }
        }
      );
    } catch (error) {
      resolve({
        success: false,
        installed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
