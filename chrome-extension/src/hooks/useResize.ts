import { useState } from 'react';

export const useResize = (initialPanelWidth: number = 380, initialConsoleHeight: number = 300) => {
  const [panelWidth, setPanelWidth] = useState(initialPanelWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [consoleHeight, setConsoleHeight] = useState(initialConsoleHeight);
  const [isResizingConsole, setIsResizingConsole] = useState(false);

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

  const handleConsoleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingConsole(true);

    const containerRect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    const startY = e.clientY;
    const startHeight = consoleHeight;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      // Calculate new height based on mouse position from bottom
      const deltaY = startY - e.clientY; // Negative when dragging down
      const newHeight = startHeight + deltaY;
      const maxHeight = containerRect.height - 100; // Leave at least 100px for iframe
      const minHeight = 150; // Minimum console height

      if (newHeight >= minHeight && newHeight <= maxHeight) {
        setConsoleHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizingConsole(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return {
    panelWidth,
    setPanelWidth,
    isResizing,
    consoleHeight,
    setConsoleHeight,
    isResizingConsole,
    handleResizeStart,
    handleConsoleResizeStart,
  };
};
