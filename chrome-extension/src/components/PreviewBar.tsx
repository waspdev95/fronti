import { ChevronLeft, ChevronRight, ExternalLink, RotateCw, ChevronsLeft, MessageSquare, Eye, Code2, Terminal } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface PreviewBarProps {
  currentUrl: string;
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
  onRefresh?: () => void;
  onUrlChange?: (url: string) => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  panelHidden?: boolean;
  onTogglePanel?: () => void;
  onToggleConsole?: () => void;
  consoleOpen?: boolean;
}

export const PreviewBar = ({
  currentUrl,
  onNavigateBack,
  onNavigateForward,
  onRefresh,
  onUrlChange,
  canGoBack = false,
  canGoForward = false,
  panelHidden = false,
  onTogglePanel,
  onToggleConsole,
  consoleOpen = false,
}: PreviewBarProps) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [urlInputValue, setUrlInputValue] = useState(currentUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  // Extract path from URL
  const getPathFromUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname + urlObj.search + urlObj.hash;
    } catch {
      return url;
    }
  };

  useEffect(() => {
    setUrlInputValue(getPathFromUrl(currentUrl));
  }, [currentUrl]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUrlChange && urlInputValue) {
      // Build full URL from path
      try {
        const currentUrlObj = new URL(currentUrl);
        const newUrl = new URL(urlInputValue, currentUrlObj.origin).href;
        onUrlChange(newUrl);
      } catch {
        // If it's already a full URL, use it directly
        onUrlChange(urlInputValue);
      }
    }
  };

  const handleOpenInNewTab = () => {
    if (currentUrl) {
      window.open(currentUrl, '_blank');
    }
  };

  return (
    <div className="flex h-12 w-full shrink-0 items-center gap-1 px-2 bg-white border-b border-gray-200">
      {/* Left side */}
      <div className="flex w-full sm:max-w-1/4 max-w-fit shrink-1 items-center gap-0.5 sm:gap-1.5">
        {/* Sidebar toggle */}
        <button
          onClick={onTogglePanel}
          className="shrink-0 cursor-pointer items-center justify-center gap-1.5 border font-medium transition hover:bg-gray-100 focus-visible:bg-gray-100 border-transparent bg-transparent text-gray-900 rounded-lg hidden sm:flex h-7 px-2"
          title={panelHidden ? "Show chat" : "Hide chat"}
        >
          {panelHidden ? (
            <>
              <MessageSquare size={16} />
              <span className="text-sm font-medium">Chat</span>
            </>
          ) : (
            <ChevronsLeft size={16} />
          )}
        </button>

        {/* Mobile sidebar toggle */}
        <button
          onClick={onTogglePanel}
          className="inline-flex shrink-0 cursor-pointer items-center justify-center border font-medium transition hover:bg-gray-100 border-transparent bg-transparent rounded-lg sm:hidden size-7 text-gray-900"
          title={panelHidden ? "Show chat" : "Hide chat"}
        >
          {panelHidden ? <MessageSquare size={16} /> : <ChevronsLeft size={16} />}
        </button>

        {/* Preview/Code tabs */}
        {/* <div className="relative h-7 font-medium hidden sm:flex">
          <div className="group absolute inset-0 rounded-[6px] border border-gray-300 bg-gray-100"></div>

          <button
            onClick={() => setActiveTab('preview')}
            className={`group relative inline-flex items-center justify-center focus-visible:outline-none cursor-pointer w-7 max-w-7 px-0 transition-colors ${
              activeTab === 'preview' ? 'text-gray-900' : 'text-gray-600'
            }`}
            title="Preview"
          >
            {activeTab === 'preview' && (
              <div className="bg-white absolute inset-[1px] rounded-[5px] shadow-sm" />
            )}
            <div className="z-10 flex items-center justify-center gap-1.5 overflow-hidden px-0">
              <Eye size={16} />
            </div>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`group relative inline-flex items-center justify-center focus-visible:outline-none cursor-pointer w-7 max-w-7 px-0 transition-colors ${
              activeTab === 'code' ? 'text-gray-900' : 'text-gray-600'
            }`}
            title="Code"
          >
            {activeTab === 'code' && (
              <div className="bg-white absolute inset-[1px] rounded-[5px] shadow-sm" />
            )}
            <div className="z-10 flex items-center justify-center gap-1.5 overflow-hidden px-0">
              <Code2 size={16} />
            </div>
          </button>
        </div> */}

        {/* Mobile code toggle */}
        {/* <button
          className="inline-flex shrink-0 cursor-pointer items-center justify-center border font-medium transition hover:bg-gray-100 bg-white text-gray-900 border-gray-300 rounded-lg sm:hidden px-0 size-7"
          title="Code"
        >
          <Code2 size={16} />
        </button> */}
      </div>

      {/* Center - Navigation and URL */}
      <div className="min-w-0 flex-1 px-1">
        <div className="flex items-center gap-1 flex-1 justify-center">
          <div className="relative flex items-center flex-1 bg-gray-100 min-w-0 border border-gray-300 rounded-md h-7 max-w-[300px]">
            {/* Navigation buttons */}
            <div className="items-center pl-1 hidden sm:flex">
              <button
                onClick={onNavigateBack}
                disabled={!canGoBack}
                className="inline-flex shrink-0 cursor-pointer items-center justify-center border font-medium transition hover:bg-gray-200 focus-visible:bg-gray-200 border-transparent bg-transparent hover:border-transparent focus:border-transparent disabled:border-transparent disabled:bg-transparent disabled:text-gray-400 text-xs text-gray-900 size-5 rounded-full p-0.5"
                title="Back"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={onNavigateForward}
                disabled={!canGoForward}
                className="inline-flex shrink-0 cursor-pointer items-center justify-center border font-medium transition hover:bg-gray-200 focus-visible:bg-gray-200 border-transparent bg-transparent hover:border-transparent focus:border-transparent disabled:border-transparent disabled:bg-transparent disabled:text-gray-400 text-xs text-gray-900 size-5 rounded-full p-0.5"
                title="Forward"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* URL input */}
            <form onSubmit={handleUrlSubmit} className="flex-1 min-w-0">
              <input
                ref={inputRef}
                className="flex-1 min-w-0 h-full pr-2 text-sm bg-transparent border-0 outline-none pl-3 sm:pl-2 w-full text-gray-500"
                spellCheck="false"
                type="text"
                value={urlInputValue}
                onChange={(e) => setUrlInputValue(e.target.value)}
              />
            </form>

            {/* Right side buttons */}
            <div className="flex items-center pr-1">
              <button
                onClick={handleOpenInNewTab}
                className="shrink-0 cursor-pointer items-center justify-center border font-medium transition hover:bg-gray-200 focus-visible:bg-gray-200 border-transparent bg-transparent hover:border-transparent focus:border-transparent text-xs text-gray-900 size-5 rounded-full p-0.5 hidden sm:flex"
                title="Open in new tab"
              >
                <ExternalLink size={16} />
              </button>
              <button
                onClick={onRefresh}
                className="inline-flex shrink-0 cursor-pointer items-center justify-center border font-medium transition hover:bg-gray-200 focus-visible:bg-gray-200 border-transparent bg-transparent hover:border-transparent focus:border-transparent text-xs text-gray-900 size-5 rounded-full p-0.5"
                title="Refresh"
              >
                <RotateCw size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex min-w-fit sm:w-1/4 items-center justify-end gap-1">
        {/* <button
          onClick={onToggleConsole}
          className={`inline-flex shrink-0 cursor-pointer items-center justify-center border font-medium transition ${
            consoleOpen
              ? 'bg-gray-900 text-white hover:bg-gray-800'
              : 'bg-transparent text-gray-900 hover:bg-gray-100 border-transparent'
          } text-sm size-7 rounded-md`}
          title={consoleOpen ? "Close console" : "Open console"}
        >
          <Terminal size={16} />
        </button> */}
      </div>
    </div>
  );
};
