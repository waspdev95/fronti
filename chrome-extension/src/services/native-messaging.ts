/**
 * Native messaging service
 * Handles communication with native host (VSCode extension)
 */

const NATIVE_HOST_NAME = 'com.ai_visual_editor.host';

// Track active ports for cleanup
const activePorts = new Set<chrome.runtime.Port>();

/**
 * Cleanup function for ports
 */
export function cleanupPort(port: chrome.runtime.Port): void {
  try {
    activePorts.delete(port);
    port.disconnect();
  } catch (err) {
    console.warn('Port cleanup error:', err);
  }
}

/**
 * Cleanup all active ports
 */
export function cleanupAllPorts(): void {
  console.log('[Cleanup] Disconnecting all active ports:', activePorts.size);
  activePorts.forEach(port => {
    try {
      port.disconnect();
    } catch (err) {
      console.warn('Port cleanup error:', err);
    }
  });
  activePorts.clear();
}

/**
 * Connect to native host
 */
function connectToNativeHost(): chrome.runtime.Port {
  const port = chrome.runtime.connectNative(NATIVE_HOST_NAME);
  activePorts.add(port);
  return port;
}

/**
 * Execute Claude command via native host
 */
export function executeClaude(
  prompt: string,
  projectPath: string,
  sessionId: string | null,
  isFirstMessage: boolean,
  toolPermissions: Record<string, boolean>,
  sendResponse: (response: any) => void
): void {
  const port = connectToNativeHost();

  // Broadcast stream messages to extension context
  port.onMessage.addListener((response) => {
    if (response.type === 'stream') {
      // Stream chunk - broadcast to all extension pages
      chrome.runtime.sendMessage({
        type: 'CLAUDE_STREAM',
        data: response.data
      }).catch(() => {}); // Ignore if no receivers
    } else if (response.type === 'complete') {
      // Operation completed - broadcast result
      chrome.runtime.sendMessage({
        type: 'CLAUDE_COMPLETE',
        success: response.success,
        error: response.error,
        usage: response.usage,
        total_cost_usd: response.total_cost_usd,
        modelUsage: response.modelUsage
      }).catch(() => {});

      sendResponse({
        success: response.success,
        error: response.error,
        usage: response.usage,
        total_cost_usd: response.total_cost_usd,
        modelUsage: response.modelUsage
      });

      // Cleanup port after completion
      cleanupPort(port);
    } else if (response.type === 'error') {
      // Error occurred - broadcast error
      chrome.runtime.sendMessage({
        type: 'CLAUDE_ERROR',
        error: response.error
      }).catch(() => {});

      sendResponse({
        success: false,
        error: response.error
      });

      // Cleanup port after error
      cleanupPort(port);
    }
  });

  port.onDisconnect.addListener(() => {
    const error = chrome.runtime.lastError;
    activePorts.delete(port);

    if (error) {
      chrome.runtime.sendMessage({
        type: 'CLAUDE_ERROR',
        error: error.message || 'Native host disconnected'
      }).catch(() => {});

      sendResponse({
        success: false,
        error: error.message || 'Native host disconnected'
      });
    }
  });

  // Send command to native host
  port.postMessage({
    command: 'execute',
    prompt,
    projectPath,
    sessionId: sessionId || null,
    isFirstMessage: isFirstMessage ?? true,
    toolPermissions: toolPermissions || {
      read: true,
      write: true,
      edit: true,
      bash: true,
      grep: true,
      glob: true
    }
  });
}

/**
 * Check if native host is available
 */
export function checkNativeHost(sendResponse: (response: any) => void): void {
  console.log('[CHECK_NATIVE_HOST] Attempting to connect to native host...');

  try {
    const port = connectToNativeHost();
    console.log('[CHECK_NATIVE_HOST] Connection attempt initiated');

    port.onMessage.addListener((response) => {
      console.log('[CHECK_NATIVE_HOST] Response received:', response);
      sendResponse(response);
      cleanupPort(port);
    });

    port.onDisconnect.addListener(() => {
      const error = chrome.runtime.lastError;
      activePorts.delete(port);
      console.error('[CHECK_NATIVE_HOST] Disconnected!', error);

      sendResponse({
        success: false,
        installed: false,
        error: error?.message || 'Native host not found'
      });
    });

    // Send check command
    console.log('[CHECK_NATIVE_HOST] Sending checkVscExtension command');
    port.postMessage({ command: 'checkVscExtension' });
  } catch (err) {
    console.error('[CHECK_NATIVE_HOST] Exception:', err);
    sendResponse({
      success: false,
      installed: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    });
  }
}

/**
 * Check if Claude Code CLI is available
 */
export function checkClaudeCode(sendResponse: (response: any) => void): void {
  const port = connectToNativeHost();

  port.onMessage.addListener((response) => {
    sendResponse(response);
    cleanupPort(port);
  });

  port.onDisconnect.addListener(() => {
    const error = chrome.runtime.lastError;
    activePorts.delete(port);
    sendResponse({
      success: false,
      installed: false,
      error: error?.message || 'Native host not found'
    });
  });

  // Send check command
  port.postMessage({ command: 'checkClaudeCode' });
}

/**
 * Check all dependencies at once
 */
export function checkAll(sendResponse: (response: any) => void): void {
  console.log('[CHECK_ALL] Checking native host and Claude Code...');

  try {
    const port = connectToNativeHost();
    console.log('[CHECK_ALL] Connection initiated');

    port.onMessage.addListener((response) => {
      console.log('[CHECK_ALL] Response received:', response);
      sendResponse(response);
      cleanupPort(port);
    });

    port.onDisconnect.addListener(() => {
      const error = chrome.runtime.lastError;
      activePorts.delete(port);
      console.error('[CHECK_ALL] Disconnected!', error);

      sendResponse({
        vscExtension: {
          success: false,
          installed: false,
          error: error?.message || 'Native host not found'
        },
        claudeCode: {
          success: false,
          installed: false,
          error: 'Cannot check - native host not available'
        }
      });
    });

    console.log('[CHECK_ALL] Sending checkAll command');
    port.postMessage({ command: 'checkAll' });
  } catch (err) {
    console.error('[CHECK_ALL] Exception:', err);
    sendResponse({
      vscExtension: {
        success: false,
        installed: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      },
      claudeCode: {
        success: false,
        installed: false,
        error: 'Cannot check - exception occurred'
      }
    });
  }
}
