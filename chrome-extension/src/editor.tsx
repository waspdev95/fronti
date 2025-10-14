import { createRoot } from 'react-dom/client';
import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Settings as SettingsIcon } from 'lucide-react';
import { Onboarding } from './components/Onboarding';
import { Settings } from './components/Settings';
import { PreviewBar } from './components/PreviewBar';
import { Console } from './components/Console';
import { useSettings } from './hooks/useSettings';
import { useAppStore } from './store';
import { useNavigation } from './hooks/useNavigation';
import { useResize } from './hooks/useResize';
import { useIframeManager } from './hooks/useIframeManager';
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
  const [panelHidden, setPanelHidden] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleMessages, setConsoleMessages] = useState<any[]>([]);
  const [networkRequests, setNetworkRequests] = useState<any[]>([]);
  const { settings } = useSettings();
  const currentIframeUrl = useAppStore((state) => state.currentIframeUrl);
  const setCurrentIframeUrl = useAppStore((state) => state.setCurrentIframeUrl);
  const selectorMode = useAppStore((state) => state.selectorMode);
  const toggleSelectorMode = useAppStore((state) => state.toggleSelectorMode);

  // Custom hooks
  const navigation = useNavigation(iframeRef, currentIframeUrl, setCurrentIframeUrl);
  const resize = useResize();
  const { shortcutManager } = useIframeManager(
    iframeRef,
    setCurrentIframeUrl,
    navigation.navigationHistoryRef,
    navigation.currentHistoryIndexRef,
    navigation.setNavigationHistory,
    navigation.setCurrentHistoryIndex,
    navigation.isProgrammaticNavigation,
    setConsoleMessages,
    setNetworkRequests
  );

  // Get last folder name from project path
  const getProjectFolderName = () => {
    if (!settings.projectPath) return null;
    const path = settings.projectPath.trim();
    const parts = path.split(/[\\/]/).filter(p => p.length > 0);
    return parts.length > 0 ? parts[parts.length - 1] : null;
  };

  const projectFolder = getProjectFolderName();

  const handleTogglePanel = () => {
    setPanelHidden(!panelHidden);
  };

  const handleToggleInspector = () => {
    // Toggle selector mode - iframe sync handled by useEffect
    toggleSelectorMode();
  };

  // Setup keyboard shortcuts
  useEffect(() => {
    const manager = shortcutManager.current;

    // Register shortcuts
    manager.register('toggle-inspector', {
      key: 'v',
      description: 'Toggle Inspector (V)',
      action: handleToggleInspector,
    });

    // Listen for keyboard events from main window
    const handleKeyDown = (e: KeyboardEvent) => {
      manager.handleKeyEvent(e);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      manager.clear();
    };
  }, [iframeRef, selectorMode]); // Re-register when dependencies change

  // Sync selector mode with iframe
  useEffect(() => {
    if (!iframeRef?.contentWindow) return;

    if (selectorMode) {
      iframeRef.contentWindow.postMessage({ type: 'AVE_ACTIVATE' }, '*');
    } else {
      iframeRef.contentWindow.postMessage({ type: 'AVE_DEACTIVATE' }, '*');
    }
  }, [selectorMode, iframeRef]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 font-sans">
      {/* Header */}
      <div className="h-[44px] flex items-center justify-between px-3 flex-shrink-0 bg-[#FAFAFA]">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          Fronti
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
          style={{ width: panelHidden ? '0px' : `${resize.panelWidth}px`, display: panelHidden ? 'none' : 'block' }}
        />

        {/* Resize Handler */}
        {!panelHidden && (
          <div
            onMouseDown={resize.handleResizeStart}
            className="hover:bg-[#f1f1f1] active:bg-[#f1f1f1] z-[100] w-[8px] cursor-col-resize absolute top-0 bottom-0 flex items-center justify-center group"
            style={{ userSelect: 'none', left: `${resize.panelWidth-8}px` }}
          >
            <div className={`w-[2px] h-12 rounded-full transition-all duration-150 ${resize.isResizing ? 'bg-gray-700 w-[3px] h-16' : 'bg-transparent group-hover:bg-gray-600 group-hover:w-[2.5px] group-hover:h-14'}`} />
          </div>
        )}

        {/* Resize Overlay - prevents iframe interaction during resize */}
        {resize.isResizing && (
          <div
            className="fixed inset-0 z-[9999] cursor-col-resize"
            style={{ userSelect: 'none' }}
          />
        )}

        {/* Console Resize Overlay */}
        {resize.isResizingConsole && (
          <div
            className="fixed inset-0 z-[9999] cursor-row-resize"
            style={{ userSelect: 'none' }}
          />
        )}

        {/* Iframe Wrapper */}
        <div className={`flex-1 min-w-0 relative flex flex-col ${panelHidden ? 'p-3' : 'pr-3 pb-3'}`}>
          <div className="flex-1 min-h-0 border border-gray-300 rounded-lg overflow-hidden flex flex-col">
            {/* Preview Bar */}
            <PreviewBar
              currentUrl={currentIframeUrl || targetUrl}
              onNavigateBack={navigation.handleNavigateBack}
              onNavigateForward={navigation.handleNavigateForward}
              onRefresh={navigation.handleRefresh}
              onUrlChange={navigation.handleUrlChange}
              canGoBack={navigation.currentHistoryIndex > 0}
              canGoForward={navigation.currentHistoryIndex < navigation.navigationHistory.length - 1}
              panelHidden={panelHidden}
              onTogglePanel={handleTogglePanel}
              onToggleConsole={() => setConsoleOpen(!consoleOpen)}
              consoleOpen={consoleOpen}
            />

            {/* Content Area - iframe + console */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="flex-1 min-h-0 overflow-hidden">
                <iframe
                  ref={setIframeRef}
                  src={targetUrl}
                  className="w-full h-full border-none"
                />
              </div>
              {consoleOpen && (
                <>
                  {/* Console Resize Handler */}
                  <div
                    onMouseDown={resize.handleConsoleResizeStart}
                    className="hover:bg-[#f1f1f1] active:bg-[#f1f1f1] z-[100] h-[12px] flex-shrink-0 cursor-row-resize relative flex items-center justify-center -mt-[6px] -mb-[6px] group"
                    style={{ userSelect: 'none' }}
                  >
                    <div className={`h-[2px] w-12 rounded-full transition-all duration-150 ${resize.isResizingConsole ? 'bg-gray-700 h-[3px] w-16' : 'bg-transparent group-hover:bg-gray-600 group-hover:h-[2.5px] group-hover:w-14'}`} />
                  </div>
                  {/* Console Panel */}
                  <div
                    className="w-full flex-shrink-0 min-h-0"
                    style={{ height: `${resize.consoleHeight}px` }}
                  >
                    <Console
                      onClose={() => setConsoleOpen(false)}
                      messages={consoleMessages}
                      networkRequests={networkRequests}
                      onClearConsole={() => setConsoleMessages([])}
                      onClearNetwork={() => setNetworkRequests([])}
                    />
                  </div>
                </>
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
