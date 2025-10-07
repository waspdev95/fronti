import { createRoot } from 'react-dom/client';
import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Settings as SettingsIcon } from 'lucide-react';
import { ExtensionManager } from './core/ExtensionManager';
import { Onboarding } from './components/Onboarding';
import { Settings } from './components/Settings';
import { PreviewBar } from './components/PreviewBar';
import { Console } from './components/Console';
import { useSettings } from './hooks/useSettings';
import { useAppStore } from './store';
import './index.css';

/**
 * Extension Page Entry Point
 * Runs in chrome-extension://xyz/editor.html
 */

function App() {
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [localhostUrl, setLocalhostUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if onboarding is already complete
    chrome.storage.local.get(['onboardingComplete', 'localhostUrl', 'projectPath'], (result) => {
      if (result.onboardingComplete && result.localhostUrl && result.projectPath) {
        setOnboardingComplete(true);
        setLocalhostUrl(result.localhostUrl);
      }
      setIsLoading(false);
    });
  }, []);

  const handleOnboardingComplete = (projectPath: string, url: string) => {
    // Save to storage
    chrome.storage.local.set({
      onboardingComplete: true,
      projectPath: projectPath,
      localhostUrl: url
    }, () => {
      setOnboardingComplete(true);
      setLocalhostUrl(url);
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Loading...
      </div>
    );
  }

  if (!onboardingComplete) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return <Editor targetUrl={localhostUrl} />;
}

function Editor({ targetUrl }: { targetUrl: string }) {
  const [iframeRef, setIframeRef] = useState<HTMLIFrameElement | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([targetUrl]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);
  const [panelWidth, setPanelWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const [panelHidden, setPanelHidden] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleMessages, setConsoleMessages] = useState<any[]>([]);
  const [networkRequests, setNetworkRequests] = useState<any[]>([]);
  const { settings } = useSettings();
  const currentIframeUrl = useAppStore((state) => state.currentIframeUrl);
  const setCurrentIframeUrl = useAppStore((state) => state.setCurrentIframeUrl);

  // Get last folder name from project path
  const getProjectFolderName = () => {
    if (!settings.projectPath) return null;
    const path = settings.projectPath.trim();
    const parts = path.split(/[\\/]/).filter(p => p.length > 0);
    return parts.length > 0 ? parts[parts.length - 1] : null;
  };

  const projectFolder = getProjectFolderName();

  // Navigation handlers
  const handleNavigateBack = () => {
    if (currentHistoryIndex > 0) {
      const newIndex = currentHistoryIndex - 1;
      setCurrentHistoryIndex(newIndex);
      if (iframeRef) {
        iframeRef.src = navigationHistory[newIndex];
      }
    }
  };

  const handleNavigateForward = () => {
    if (currentHistoryIndex < navigationHistory.length - 1) {
      const newIndex = currentHistoryIndex + 1;
      setCurrentHistoryIndex(newIndex);
      if (iframeRef) {
        iframeRef.src = navigationHistory[newIndex];
      }
    }
  };

  const handleRefresh = () => {
    if (iframeRef) {
      // Force reload by reassigning src
      const currentSrc = iframeRef.src;
      iframeRef.src = '';
      setTimeout(() => {
        iframeRef.src = currentSrc;
      }, 10);
    }
  };

  const handleTogglePanel = () => {
    setPanelHidden(!panelHidden);
  };

  const handleUrlChange = (newUrl: string) => {
    if (iframeRef) {
      iframeRef.src = newUrl;
    }
  };

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const newWidth = e.clientX;
      const maxWidth = window.innerWidth * 0.8; // 80% of screen width
      // Min width: 280px, Max width: 80% of screen
      if (newWidth >= 280 && newWidth <= maxWidth) {
        setPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Periodically check URL changes
  useEffect(() => {
    if (!iframeRef?.contentWindow) return;

    const interval = setInterval(() => {
      iframeRef.contentWindow?.postMessage({ type: 'AVE_GET_URL' }, '*');
    }, 1000);

    return () => clearInterval(interval);
  }, [iframeRef]);

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

      // Network messages - capture early so they're not lost
      if (type === 'AVE_NETWORK') {
        setNetworkRequests(prev => [...prev, {
          id: `${Date.now()}-${Math.random()}`,
          ...event.data.request
        }]);
        return;
      }

      if (type === 'AVE_URL_CHANGED') {
        const newUrl = event.data.url;
        setCurrentIframeUrl(newUrl);

        // Update navigation history
        if (navigationHistory[currentHistoryIndex] !== newUrl) {
          const newHistory = navigationHistory.slice(0, currentHistoryIndex + 1);
          newHistory.push(newUrl);
          setNavigationHistory(newHistory);
          setCurrentHistoryIndex(newHistory.length - 1);
        }
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

    // Wait for iframe to load - content script will auto-inject
    const loadHandler = () => {
      // Reset bridge ready flag on new page load
      bridgeReady = false;

      // Initialize Extension Manager (auto-enabled, message-based mode)
      manager = new ExtensionManager(panelRoot, iframe, true);

      // Wait for bridge ready message from content script
      // Content script auto-loads via manifest.json all_frames: true
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

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 font-sans">
      {/* Header */}
      <div className="h-[44px] flex items-center justify-between px-3 flex-shrink-0 bg-[#FAFAFA]">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          Visual Editor AI
          {projectFolder && (
            <span className="text-xs font-semibold text-gray-900 bg-white border border-gray-200 px-2 py-1 rounded-md shadow-sm" title={`Project: ${settings.projectPath}`}>
              {projectFolder}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`${
            showSettings
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          } border border-gray-200 rounded-md p-1.5 cursor-pointer flex items-center justify-center transition-all duration-150 shadow-sm`}
          title="Settings"
        >
          <SettingsIcon size={18} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Panel */}
        <div
          id="ave-panel-container"
          className="overflow-auto flex-shrink-0 bg-[#FAFAFA]"
          style={{ width: panelHidden ? '0px' : `${panelWidth}px`, display: panelHidden ? 'none' : 'block' }}
        />

        {/* Resize Handler */}
        {!panelHidden && (
          <div
            onMouseDown={handleResizeStart}
            className="w-[12px] flex-shrink-0 cursor-col-resize relative flex items-center justify-center -ml-[6px] -mr-[6px] group"
            style={{ userSelect: 'none' }}
          >
            <div className={`z-[100] w-[2px] h-12 rounded-full transition-all duration-150 ${isResizing ? 'bg-gray-700 w-[3px] h-16' : 'bg-transparent group-hover:bg-gray-600 group-hover:w-[2.5px] group-hover:h-14'}`} />
          </div>
        )}

        {/* Resize Overlay - prevents iframe interaction during resize */}
        {isResizing && (
          <div
            className="fixed inset-0 z-[9999] cursor-col-resize"
            style={{ userSelect: 'none' }}
          />
        )}

        {/* Iframe Wrapper */}
        <div className={`flex-1 relative flex flex-col ${panelHidden ? 'p-3' : 'pr-3 pb-3'}`}>
          <div className="flex-1 border border-gray-300 rounded-lg overflow-hidden flex flex-col">
            {/* Preview Bar */}
            <PreviewBar
              currentUrl={currentIframeUrl || targetUrl}
              onNavigateBack={handleNavigateBack}
              onNavigateForward={handleNavigateForward}
              onRefresh={handleRefresh}
              onUrlChange={handleUrlChange}
              canGoBack={currentHistoryIndex > 0}
              canGoForward={currentHistoryIndex < navigationHistory.length - 1}
              panelHidden={panelHidden}
              onTogglePanel={handleTogglePanel}
              onToggleConsole={() => setConsoleOpen(!consoleOpen)}
              consoleOpen={consoleOpen}
            />

            {/* Content Area - iframe + console */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <iframe
                ref={setIframeRef}
                src={targetUrl}
                className={`w-full ${consoleOpen ? 'h-3/5' : 'h-full'} border-none transition-all duration-200`}
              />
              {consoleOpen && (
                <div className="w-full h-2/5">
                  <Console
                    onClose={() => setConsoleOpen(false)}
                    messages={consoleMessages}
                    networkRequests={networkRequests}
                    onClearConsole={() => setConsoleMessages([])}
                    onClearNetwork={() => setNetworkRequests([])}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Settings Modal */}
        <Dialog.Root open={showSettings} onOpenChange={setShowSettings}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/80 z-[999]" />
            <Dialog.Content className="fixed top-0 right-0 bottom-0 w-[420px] bg-white border-l border-gray-200 shadow-2xl z-[1000] overflow-auto p-6 focus:outline-none">
              <div className="mb-6 flex items-center justify-between">
                <Dialog.Title className="m-0 text-lg font-semibold text-gray-900">
                  Settings
                </Dialog.Title>
                <Dialog.Close className="bg-transparent border-none text-xl cursor-pointer px-2 py-1 leading-none text-gray-500 rounded-md hover:bg-gray-50 transition-colors">
                  ×
                </Dialog.Close>
              </div>
              <Settings />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  );
}

// Render App
const root = document.getElementById('editor-root');
if (root) {
  createRoot(root).render(<App />);
}
