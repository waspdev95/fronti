// Background script - Native messaging ile Claude CLI'a bağlanır

// Track active ports for cleanup
const activePorts = new Set<chrome.runtime.Port>();

// Cleanup function
function cleanupPort(port: chrome.runtime.Port) {
  try {
    activePorts.delete(port);
    port.disconnect();
  } catch (err) {
    console.warn('Port cleanup error:', err);
  }
}

// Cleanup all ports (on extension shutdown/suspend)
function cleanupAllPorts() {
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

// Listen for extension suspend/shutdown
chrome.runtime.onSuspend?.addListener(() => {
  console.log('[Cleanup] Extension suspending - cleaning up ports');
  cleanupAllPorts();
});

// Extension icon click handler - Open editor page in new tab
chrome.action.onClicked.addListener(async () => {
  // Open editor page without URL parameter
  const editorUrl = chrome.runtime.getURL('editor.html');
  await chrome.tabs.create({ url: editorUrl });
});

// Keyboard shortcut handler
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-editor') {
    // Open editor page without URL parameter
    const editorUrl = chrome.runtime.getURL('editor.html');
    await chrome.tabs.create({ url: editorUrl });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXECUTE_CLAUDE') {
    const { prompt, projectPath, sessionId, isFirstMessage } = message;

    // Native messaging host'a mesaj gönder
    const port = chrome.runtime.connectNative('com.ai_visual_editor.host');
    activePorts.add(port);

    // Stream mesajlarını extension context'e broadcast et
    port.onMessage.addListener((response) => {
      if (response.type === 'stream') {
        // Stream chunk - broadcast to all extension pages
        chrome.runtime.sendMessage({
          type: 'CLAUDE_STREAM',
          data: response.data
        }).catch(() => {}); // Ignore if no receivers
      } else if (response.type === 'complete') {
        // İşlem tamamlandı - broadcast
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

        // İşlem tamamlandı - port'u kapat
        cleanupPort(port);
      } else if (response.type === 'error') {
        // Hata - broadcast
        chrome.runtime.sendMessage({
          type: 'CLAUDE_ERROR',
          error: response.error
        }).catch(() => {});

        sendResponse({
          success: false,
          error: response.error
        });

        // Hata aldık - port'u kapat
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

    // Komutu gönder
    port.postMessage({
      command: 'execute',
      prompt: prompt,
      projectPath: projectPath,
      sessionId: sessionId || null,
      isFirstMessage: isFirstMessage ?? true
    });

    return true; // Async response için
  } else if (message.type === 'CHECK_NATIVE_HOST') {
    // Check if native host is available
    console.log('[CHECK_NATIVE_HOST] Attempting to connect to native host...');

    try {
      const port = chrome.runtime.connectNative('com.ai_visual_editor.host');
      activePorts.add(port);
      console.log('[CHECK_NATIVE_HOST] Connection attempt initiated');

      port.onMessage.addListener((response) => {
        console.log('[CHECK_NATIVE_HOST] Response received:', response);
        sendResponse(response);
        cleanupPort(port); // Response aldık - port'u kapat
      });

      port.onDisconnect.addListener(() => {
        const error = chrome.runtime.lastError;
        activePorts.delete(port);
        console.error('[CHECK_NATIVE_HOST] Disconnected!', error);
        console.error('[CHECK_NATIVE_HOST] Error details:', {
          message: error?.message,
          fullError: error
        });

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

    return true; // Async response
  } else if (message.type === 'CHECK_CLAUDE_CODE') {
    // Check if Claude Code CLI is available
    const port = chrome.runtime.connectNative('com.ai_visual_editor.host');
    activePorts.add(port);

    port.onMessage.addListener((response) => {
      sendResponse(response);
      cleanupPort(port); // Response aldık - port'u kapat
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

    return true; // Async response
  } else if (message.type === 'CHECK_ALL') {
    // Check everything at once
    console.log('[CHECK_ALL] Checking native host and Claude Code...');

    try {
      const port = chrome.runtime.connectNative('com.ai_visual_editor.host');
      activePorts.add(port);
      console.log('[CHECK_ALL] Connection initiated');

      port.onMessage.addListener((response) => {
        console.log('[CHECK_ALL] Response received:', response);
        sendResponse(response);
        cleanupPort(port); // Response aldık - port'u kapat
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

    return true; // Async response
  }
});
