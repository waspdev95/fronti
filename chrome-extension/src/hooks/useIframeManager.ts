import { useEffect, useRef, useState } from 'react';
import { ExtensionManager } from '../core/ExtensionManager';
import { useAppStore } from '../store';
import { KeyboardShortcutManager } from '../utils/keyboard-shortcuts';

export const useIframeManager = (
  iframeRef: HTMLIFrameElement | null,
  setCurrentIframeUrl: (url: string) => void,
  navigationHistoryRef: React.MutableRefObject<string[]>,
  currentHistoryIndexRef: React.MutableRefObject<number>,
  setNavigationHistory: (history: string[]) => void,
  setCurrentHistoryIndex: (index: number) => void,
  isProgrammaticNavigation: React.MutableRefObject<boolean>,
  setConsoleMessages: React.Dispatch<React.SetStateAction<any[]>>,
  setNetworkRequests: React.Dispatch<React.SetStateAction<any[]>>
) => {
  const shortcutManager = useRef(new KeyboardShortcutManager());
  const [managerReady, setManagerReady] = useState(false);

  useEffect(() => {
    if (!iframeRef) return;

    const iframe = iframeRef;

    // Get panel container (no shadow DOM)
    const panelRoot = document.getElementById('ave-panel-container');
    if (!panelRoot) {
      throw new Error('Panel container not found');
    }

    let manager: ExtensionManager | null = null;
    let bridgeReady = false;

    // Listen for messages from iframe-bridge
    const messageHandler = (event: MessageEvent) => {
      // Security: only accept from our iframe or if it's a bridge ready message
      const { type, element, shiftKey } = event.data;

      // Handle keyboard events from iframe
      if (type === 'AVE_KEYDOWN') {
        const { keyEvent, isInInput } = event.data;
        shortcutManager.current.handleKeyEvent(keyEvent, isInInput);
        return;
      }

      // Allow certain messages without strict source check (from iframe content script)
      if (type === 'AVE_BRIDGE_READY') {
        bridgeReady = true;
        // Activate bridge based on selector mode
        const store = useAppStore.getState();
        if (store.selectorMode) {
          iframe.contentWindow?.postMessage({ type: 'AVE_ACTIVATE' }, '*');
        }
        // Request current URL
        iframe.contentWindow?.postMessage({ type: 'AVE_GET_URL' }, '*');
        return;
      }

      // Console messages - capture early so they're not lost
      if (type === 'AVE_CONSOLE') {
        setConsoleMessages(prev => [...prev, {
          id: `${Date.now()}-${Math.random()}`,
          type: event.data.level,
          args: event.data.args,
          timestamp: Date.now()
        }]);
        return;
      }

      // Network messages from iframe
      if (type === 'AVE_NETWORK') {
        setNetworkRequests(prev => [...prev, event.data.data]);
        return;
      }

      if (type === 'AVE_URL_CHANGED') {
        const newUrl = event.data.url;
        const navigationType = event.data.navigationType; // 'push', 'replace', 'reload', 'traverse'

        setCurrentIframeUrl(newUrl);

        // Ignore if this is OUR programmatic navigation (back/forward buttons)
        if (isProgrammaticNavigation.current) {
          isProgrammaticNavigation.current = false;
          return;
        }

        // Ignore traverse events (iframe's own back/forward) - we manage our own history
        if (navigationType === 'traverse') {
          return;
        }

        // Use refs to get current state (avoid stale closure)
        const currentHistory = navigationHistoryRef.current;
        const currentIndex = currentHistoryIndexRef.current;

        // Don't add if we're already at this URL
        if (currentHistory[currentIndex] === newUrl) {
          return;
        }

        // Handle 'push' navigation (new page) - add to history
        if (navigationType === 'push' || navigationType === 'reload' || !navigationType) {
          if (currentHistory.length === 0) {
            setNavigationHistory([newUrl]);
            setCurrentHistoryIndex(0);
          } else {
            const newHistory = currentHistory.slice(0, currentIndex + 1);
            newHistory.push(newUrl);
            setNavigationHistory(newHistory);
            setCurrentHistoryIndex(newHistory.length - 1);
          }
        }
        // Ignore 'replace' - doesn't create new history entry

        return;
      }

      // For other messages, verify source
      if (event.source !== iframe.contentWindow) return;

      if (type === 'AVE_CURRENT_URL') {
        setCurrentIframeUrl(event.data.url);
      } else if (type === 'AVE_HOVER' && manager) {
        manager.handleHover(element);
      } else if (type === 'AVE_CLICK' && manager) {
        manager.handleClick(element, shiftKey);
      } else if (type === 'AVE_ESCAPE' && manager) {
        manager.handleEscape();
      } else if (type === 'AVE_POSITION_UPDATE' && manager) {
        manager.handlePositionUpdate(element);
      } else if (type === 'AVE_PARENT_SELECTED' && manager) {
        manager.handleParentSelect(element);
      } else if (type === 'AVE_PARENT_PREVIEW' && manager) {
        manager.handleParentPreview(element);
      }
    };

    window.addEventListener('message', messageHandler);

    // Wait for iframe to load - manually inject bridge script
    const loadHandler = () => {
      // Reset bridge ready flag on new page load
      bridgeReady = false;

      // Initialize Extension Manager (auto-enabled, message-based mode)
      manager = new ExtensionManager(panelRoot, iframe, true);
      setManagerReady(true);

      // Manually inject bridge script into iframe
      // Content scripts don't auto-inject into iframes that are children of extension pages
      try {
        if (iframe.contentWindow && iframe.contentDocument) {
          // Get the bridge script filename from manifest (handles dynamic hash)
          const manifest = chrome.runtime.getManifest();
          const contentScripts = manifest.content_scripts || [];
          const bridgeScript = contentScripts[0]?.js?.[0]; // Should be our iframe-bridge script

          if (bridgeScript) {
            // Get the full URL
            const bridgeScriptUrl = chrome.runtime.getURL(bridgeScript);

            // Create and inject script element
            const script = iframe.contentDocument.createElement('script');
            script.src = bridgeScriptUrl;
            script.type = 'text/javascript';

            // Inject at document start
            if (iframe.contentDocument.head) {
              iframe.contentDocument.head.insertBefore(script, iframe.contentDocument.head.firstChild);
            } else if (iframe.contentDocument.documentElement) {
              iframe.contentDocument.documentElement.appendChild(script);
            }
          }
        }
      } catch (e) {
        console.error('Failed to inject bridge script:', e);
      }
    };

    // Listen to load event - will fire on every navigation
    iframe.addEventListener('load', loadHandler);

    // Cleanup
    return () => {
      window.removeEventListener('message', messageHandler);
      iframe.removeEventListener('load', loadHandler);

      // Clean up manager
      if (manager) {
        manager = null;
      }
    };
  }, [iframeRef]);

  return { shortcutManager, managerReady };
};
