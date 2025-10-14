/**
 * Background service worker for Chrome extension
 * Manages native messaging connection to Claude CLI via VSCode extension
 */

import {
  executeClaude,
  checkNativeHost,
  checkClaudeCode,
  checkAll,
  cleanupAllPorts
} from './services/native-messaging';

// Listen for extension suspend/shutdown
chrome.runtime.onSuspend?.addListener(() => {
  console.log('[Cleanup] Extension suspending - cleaning up ports');
  cleanupAllPorts();
});

// Extension icon click handler - Open editor page in new tab
chrome.action.onClicked.addListener(async () => {
  const editorUrl = chrome.runtime.getURL('editor.html');
  await chrome.tabs.create({ url: editorUrl });
});

// Message handler for extension commands
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'EXECUTE_CLAUDE': {
      const { prompt, projectPath, sessionId, isFirstMessage, toolPermissions } = message;
      executeClaude(prompt, projectPath, sessionId, isFirstMessage, toolPermissions, sendResponse);
      return true; // Keep message channel open for async response
    }

    case 'CHECK_NATIVE_HOST': {
      checkNativeHost(sendResponse);
      return true; // Async response
    }

    case 'CHECK_CLAUDE_CODE': {
      checkClaudeCode(sendResponse);
      return true; // Async response
    }

    case 'CHECK_ALL': {
      checkAll(sendResponse);
      return true; // Async response
    }

    default:
      return false;
  }
});
