import { useState, useRef } from 'react';

export const useNavigation = (
  iframeRef: HTMLIFrameElement | null,
  currentIframeUrl: string | null,
  setCurrentIframeUrl: (url: string) => void
) => {
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);

  // Flag to track programmatic navigation (back/forward/url input)
  const isProgrammaticNavigation = useRef(false);

  // Refs to track current state in message handler (avoids stale closure)
  const navigationHistoryRef = useRef(navigationHistory);
  const currentHistoryIndexRef = useRef(currentHistoryIndex);

  // Update refs whenever state changes
  navigationHistoryRef.current = navigationHistory;
  currentHistoryIndexRef.current = currentHistoryIndex;

  const handleNavigateBack = () => {
    if (currentHistoryIndex > 0 && iframeRef) {
      const newIndex = currentHistoryIndex - 1;
      const newUrl = navigationHistory[newIndex];
      setCurrentHistoryIndex(newIndex);
      setCurrentIframeUrl(newUrl); // Update URL immediately for instant UI feedback
      isProgrammaticNavigation.current = true;
      iframeRef.src = newUrl;
    }
  };

  const handleNavigateForward = () => {
    if (currentHistoryIndex < navigationHistory.length - 1 && iframeRef) {
      const newIndex = currentHistoryIndex + 1;
      const newUrl = navigationHistory[newIndex];
      setCurrentHistoryIndex(newIndex);
      setCurrentIframeUrl(newUrl); // Update URL immediately for instant UI feedback
      isProgrammaticNavigation.current = true;
      iframeRef.src = newUrl;
    }
  };

  const handleRefresh = () => {
    if (iframeRef && currentIframeUrl) {
      // Use the tracked URL, not iframe.src (which doesn't update on navigation)
      isProgrammaticNavigation.current = true;
      iframeRef.src = '';
      setTimeout(() => {
        iframeRef.src = currentIframeUrl;
      }, 10);
    }
  };

  const handleUrlChange = (newUrl: string) => {
    if (iframeRef) {
      isProgrammaticNavigation.current = true;
      iframeRef.src = newUrl;
    }
  };

  return {
    navigationHistory,
    currentHistoryIndex,
    isProgrammaticNavigation,
    navigationHistoryRef,
    currentHistoryIndexRef,
    setNavigationHistory,
    setCurrentHistoryIndex,
    handleNavigateBack,
    handleNavigateForward,
    handleRefresh,
    handleUrlChange,
  };
};
