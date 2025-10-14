import { useState } from 'react';
import { useAppStore } from '../store';

export const useQueueHandlers = (
  executeTask: (command: string, selectedElements: any[], iframeUrl: string, placeholder?: any) => void,
  isStreaming: boolean
) => {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  const {
    getNextQueueItem,
    removeFromQueue,
    isAnyQueueItemEditing,
    startEditingQueueItem,
    updateQueueItemCommand,
    cancelEditingQueueItem,
  } = useAppStore();

  const handleElementHover = (path: string) => {
    const iframe = document.querySelector('iframe');
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'AVE_HIGHLIGHT_ELEMENT',
        path
      }, '*');
    }
  };

  const handleElementLeave = () => {
    const iframe = document.querySelector('iframe');
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'AVE_CLEAR_HIGHLIGHT'
      }, '*');
    }
  };

  const handleEditClick = (task: any) => {
    setEditingTaskId(task.id);
    setEditingText(task.command);
    startEditingQueueItem(task.id);

    // Select related elements in iframe for visual feedback
    if (task.selectedElements.length > 0) {
      const iframe = document.querySelector('iframe');
      task.selectedElements.forEach((el: any) => {
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({
            type: 'AVE_HIGHLIGHT_ELEMENT',
            path: el.path
          }, '*');
        }
      });
    }
  };

  const handleSaveClick = (taskId: string) => {
    updateQueueItemCommand(taskId, editingText);
    setEditingTaskId(null);
    setEditingText('');

    // Clear highlight in iframe
    const iframe = document.querySelector('iframe');
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'AVE_CLEAR_HIGHLIGHT'
      }, '*');
    }

    // If AI is idle, auto-process the queue
    if (!isStreaming) {
      // Wait a bit for state to settle, then check if there's a next task
      setTimeout(() => {
        const nextTask = getNextQueueItem();
        if (nextTask && !isAnyQueueItemEditing()) {
          // Remove from queue
          removeFromQueue(nextTask.id);

          // Execute it
          const taskElements = nextTask.selectedElements.map((el: any) => ({
            ...el,
            element: null as any
          }));
          executeTask(nextTask.command, taskElements, nextTask.iframeUrl);
        }
      }, 100);
    }
  };

  const handleCancelClick = (taskId: string) => {
    cancelEditingQueueItem(taskId);
    setEditingTaskId(null);
    setEditingText('');

    // Clear highlight in iframe
    const iframe = document.querySelector('iframe');
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'AVE_CLEAR_HIGHLIGHT'
      }, '*');
    }
  };

  const handleMoveToTask = (task: any) => {
    // Dispatch event to add to tasks
    const event = new CustomEvent('add-prompt', {
      detail: {
        content: task.command,
        selectedElements: task.selectedElements,
        placeholder: null,
        iframeUrl: task.iframeUrl || 'unknown'
      }
    });
    window.dispatchEvent(event);

    // Remove from queue
    removeFromQueue(task.id);
  };

  const handleDeleteClick = (taskId: string) => {
    removeFromQueue(taskId);
  };

  return {
    editingTaskId,
    editingText,
    setEditingText,
    handleElementHover,
    handleElementLeave,
    handleEditClick,
    handleSaveClick,
    handleCancelClick,
    handleMoveToTask,
    handleDeleteClick,
  };
};
