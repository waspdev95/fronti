import React, { useRef, useEffect, useState } from 'react';
import { Send, MousePointer2 } from 'lucide-react';
import { useAppStore } from '../store';
import { useSettings } from '../hooks/useSettings';
import { Tooltip } from './Tooltip';
import { getElementDisplayText } from '../utils/element-display';
import { useClaudeStream } from '../hooks/useClaudeStream';
import { useTaskManager } from '../hooks/useTaskManager';
import { useQueueHandlers } from '../hooks/useQueueHandlers';
import { ChatMessages } from './ChatMessages';
import { QueueTaskTabs } from './QueueTaskTabs';

export const ChatInput = () => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamContentRef = useRef<HTMLDivElement>(null);
  const [streamingText, setStreamingText] = useState<string>('');
  const streamingTextRef = useRef<string>('');
  const currentBlockRef = useRef<{ type: string; index: number; name?: string } | null>(null);
  const toolInputRef = useRef<string>('');

  const {
    selectedElements,
    command,
    setCommand,
    setElementTaskState,
    removeElementTask,
    isStreaming,
    setIsStreaming,
    currentSessionId,
    startNewSession,
    loadSessionsFromStorage,
    getIsFirstMessage,
    setMessageSent,
    addUserMessage,
    addAssistantMessage,
    getCurrentMessages,
    addToolMessage,
    removeSelectedElementByIndex,
    currentIframeUrl,
    selectorMode,
    toggleSelectorMode,
    taskQueue,
    addToQueue,
    getNextQueueItem,
    removeFromQueue,
    clearSelectedElements,
    isAnyQueueItemEditing,
    placeholder,
    clearPlaceholder,
  } = useAppStore();

  const { settings } = useSettings();
  const { tasks, setTasks } = useTaskManager();

  // Load sessions on mount
  useEffect(() => {
    loadSessionsFromStorage();

    // Create initial session if none exists
    if (!currentSessionId) {
      startNewSession();
    }
  }, []);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedElements]);

  useEffect(() => {
    const handleSetCommand = (e: CustomEvent) => {
      const { command: newCommand } = e.detail;
      setCommand(newCommand);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };

    const handleQueueTask = (e: CustomEvent) => {
      const { content, selectedElements = [], placeholder: taskPlaceholder = null, iframeUrl = 'unknown' } = e.detail;

      // Convert selectedElements to ElementInfo format for executeTask
      const taskElements = selectedElements.map((el: any) => ({
        ...el,
        element: null as any // We don't have the actual HTMLElement
      }));

      // If AI is already streaming, add to queue
      if (isStreaming) {
        addToQueue(content, taskElements, iframeUrl);
      } else {
        // Execute immediately with task-specific placeholder
        executeTask(content, taskElements, iframeUrl, taskPlaceholder);
      }
    };

    window.addEventListener('ave-set-command', handleSetCommand as EventListener);
    window.addEventListener('queue-task', handleQueueTask as EventListener);

    return () => {
      window.removeEventListener('ave-set-command', handleSetCommand as EventListener);
      window.removeEventListener('queue-task', handleQueueTask as EventListener);
    };
  }, [setCommand, isStreaming, addToQueue, currentIframeUrl]);

  // Store handlers in a ref to avoid re-adding listeners
  const handlersRef = useRef({
    setIsStreaming,
    selectedElements,
    setElementTaskState,
    removeElementTask,
    addAssistantMessage,
    addToolMessage,
    getNextQueueItem,
    removeFromQueue,
    isAnyQueueItemEditing,
    executeTask: null as any
  });

  // Update handlers ref on every render
  useEffect(() => {
    handlersRef.current = {
      setIsStreaming,
      selectedElements,
      setElementTaskState,
      removeElementTask,
      addAssistantMessage,
      addToolMessage,
      getNextQueueItem,
      removeFromQueue,
      isAnyQueueItemEditing,
      executeTask: handlersRef.current.executeTask
    };
  });

  // Use the Claude streaming hook
  useClaudeStream(
    streamingTextRef,
    setStreamingText,
    currentBlockRef,
    toolInputRef,
    handlersRef
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  // Auto-grow textarea
  useEffect(() => {
    if (inputRef.current) {
      // Reset height to auto to get accurate scrollHeight
      inputRef.current.style.height = 'auto';
      // Calculate new height based on content (min 44px, max 200px)
      const newHeight = Math.max(44, Math.min(inputRef.current.scrollHeight, 200));
      inputRef.current.style.height = `${newHeight}px`;
    }
  }, [command]);

  // Execute a task (either from form submit or from queue)
  const executeTask = (taskCommand: string, taskSelectedElements: typeof selectedElements, taskUrl: string, taskPlaceholder: typeof placeholder = null) => {
    let fullPrompt = '';

    // Check if there's a placeholder (either from task or current state) - if so, prepend position info to the command
    let augmentedCommand = taskCommand;
    const effectivePlaceholder = taskPlaceholder || placeholder;
    if (effectivePlaceholder) {
      const positionText =
        effectivePlaceholder.position === 'top' ? 'above' :
        effectivePlaceholder.position === 'bottom' ? 'below' :
        effectivePlaceholder.position === 'left' ? 'to the left of' :
        'to the right of';
      const elementRef = `${effectivePlaceholder.relativeToElement.tag}${effectivePlaceholder.relativeToElement.id ? `#${effectivePlaceholder.relativeToElement.id}` : ''}${effectivePlaceholder.relativeToElement.classes ? `.${effectivePlaceholder.relativeToElement.classes}` : ''}`;
      augmentedCommand = `Add an element ${positionText} ${elementRef}. ${taskCommand}`;
    }

    if (taskSelectedElements.length > 0) {
      const elementsInfo = taskSelectedElements.map(info => {
        return `Element: ${info.tag}${info.id ? `#${info.id}` : ''}${info.classes ? `.${info.classes}` : ''}
Path: ${info.path}
Content: ${info.text}

Related Element Styles:
${info.css}`;
      }).join('\n\n');

      fullPrompt = `Current Page: ${taskUrl}
Page Title: ${document.title}

Related Element${taskSelectedElements.length > 1 ? 's' : ''}:
${elementsInfo}

The user selected ${taskSelectedElements.length > 1 ? 'these elements' : 'this element'} in the Claude visual editor tool. The element information is provided only as context. The actual task is what is written in the task section.

Task: ${augmentedCommand}`;
    } else {
      fullPrompt = `Task: ${augmentedCommand}`;
    }

    // Save user message with selected elements
    const elementsForMessage = taskSelectedElements.map(el => ({
      tag: el.tag,
      id: el.id,
      classes: el.classes,
      path: el.path
    }));
    addUserMessage(taskCommand, elementsForMessage.length > 0 ? elementsForMessage : undefined);

    // Start streaming
    setIsStreaming(true);

    // Reset streaming state
    streamingTextRef.current = '';
    setStreamingText('');
    toolInputRef.current = '';
    currentBlockRef.current = null;

    // Check if this is the first message of the session
    const isFirstMessage = getIsFirstMessage();

    taskSelectedElements.forEach(info => {
      setElementTaskState(info.element, 'loading');
    });

    chrome.runtime.sendMessage(
      {
        type: 'EXECUTE_CLAUDE',
        prompt: fullPrompt,
        projectPath: settings.projectPath,
        sessionId: currentSessionId,
        isFirstMessage: isFirstMessage,
        toolPermissions: settings.toolPermissions,
      }
    );

    // Mark that a message has been sent in this session
    setMessageSent();
  };

  // Assign executeTask to handlersRef for use in event listeners
  handlersRef.current.executeTask = executeTask;

  // Queue handlers
  const queueHandlers = useQueueHandlers(executeTask, isStreaming);

  const handleQueueTask = (content: string, selectedElements: any[], placeholder: any, iframeUrl: string) => {
    // Queue the task through handleQueueTask event
    const event = new CustomEvent('queue-task', {
      detail: { content, selectedElements, placeholder, iframeUrl }
    });
    window.dispatchEvent(event);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if project path is set (required)
    if (!settings.projectPath || !settings.projectPath.trim()) {
      addAssistantMessage('Please set your project directory in Settings first.');
      return;
    }

    if (!command.trim()) return;

    // If AI is already streaming, add to queue instead
    if (isStreaming) {
      addToQueue(command, selectedElements, currentIframeUrl || 'unknown');
      setCommand('');
      clearSelectedElements();
      clearPlaceholder();
      // Keep inspector mode active by NOT toggling it
      return;
    }

    // Execute the task
    executeTask(command, selectedElements, currentIframeUrl || 'unknown');
    setCommand('');
    clearSelectedElements();
    clearPlaceholder();

    // Keep inspector mode active - don't toggle it off
    // This allows user to immediately select another element for the next task
  };

  // Get current messages
  const messages = getCurrentMessages();

  // Auto-scroll only if user is already at bottom
  useEffect(() => {
    if (!streamContentRef.current) return;

    const element = streamContentRef.current;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;

    if (isNearBottom) {
      element.scrollTop = element.scrollHeight;
    }
  }, [streamingText, messages]);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full gap-3 overflow-hidden">
      {/* Chat history or spacer */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center gap-3 p-1" ref={streamContentRef}>
        <div className="w-full max-w-[600px] min-w-0 flex flex-col gap-3">
          <ChatMessages
            messages={messages}
            isStreaming={isStreaming}
            streamingText={streamingText}
            projectPath={settings.projectPath}
          />
        </div>
      </div>

      <div className="w-full flex flex-col items-center gap-3 overflow-x-hidden">
        <div className="w-full max-w-[600px] min-w-0 flex flex-col gap-3">
          {/* Loading indicator */}
          {isStreaming && (
            <div className="flex items-center py-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-gray-900 rounded-full animate-[dotPulse_1.4s_ease-in-out_infinite]"></span>
                <span className="w-2 h-2 bg-gray-900 rounded-full animate-[dotPulse_1.4s_ease-in-out_0.2s_infinite]"></span>
                <span className="w-2 h-2 bg-gray-900 rounded-full animate-[dotPulse_1.4s_ease-in-out_0.4s_infinite]"></span>
              </div>
            </div>
          )}

          {/* Queue/Tasks Tabs */}
          <QueueTaskTabs
            taskQueue={taskQueue}
            tasks={tasks}
            setTasks={setTasks}
            editingTaskId={queueHandlers.editingTaskId}
            editingText={queueHandlers.editingText}
            onEditTextChange={queueHandlers.setEditingText}
            onElementHover={queueHandlers.handleElementHover}
            onElementLeave={queueHandlers.handleElementLeave}
            onEditClick={queueHandlers.handleEditClick}
            onSaveClick={queueHandlers.handleSaveClick}
            onCancelClick={queueHandlers.handleCancelClick}
            onMoveToTask={queueHandlers.handleMoveToTask}
            onDeleteClick={queueHandlers.handleDeleteClick}
            onQueueTask={handleQueueTask}
            isStreaming={isStreaming}
          />

          {/* Show either placeholder badge OR selected elements badges, not both */}
          {placeholder ? (
            /* Placeholder Badge - When adding element at specific position */
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-300 rounded-md text-sm font-medium text-blue-700">
                <span>
                  {placeholder.position === 'top' ? 'Add an element above' :
                   placeholder.position === 'bottom' ? 'Add an element below' :
                   placeholder.position === 'left' ? 'Add an element to the left of' :
                   'Add an element to the right of'}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700">
                <span>{getElementDisplayText(placeholder.relativeToElement)}</span>
                <button
                  type="button"
                  onClick={() => clearPlaceholder()}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
          ) : (
            /* Selected Elements Badges - Only show when no placeholder */
            selectedElements.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedElements.map((el, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700"
                  >
                    <span>{getElementDisplayText(el)}</span>
                    <button
                      type="button"
                      onClick={() => removeSelectedElementByIndex(index)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          <div className="p-3 z-20 relative rounded-xl overflow-visible bg-white border border-gray-300 focus-within:border-gray-500 shadow-sm transition-[border-color,box-shadow] duration-200">
        {/* Textarea */}
        <div className="w-full pb-2">
          <textarea
            ref={inputRef}
            className="w-full text-sm resize-none border-0 outline-none bg-transparent placeholder:text-gray-400 disabled:opacity-50 overflow-y-auto max-h-[200px]"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? "Add to queue..." : "Ask Fronti to do anything"}
            rows={1}
            style={{ minHeight: '44px', height: '44px' }}
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1">
          {/* Left side buttons */}
          <div className="flex items-end gap-0.5 sm:gap-1 flex-1">
            {/* Inspector Mode Toggle */}
            <Tooltip content="Select an element (V)" side="top">
              <button
                type="button"
                className={`inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 border font-medium transition px-2 text-sm h-7 rounded-md ${
                  selectorMode
                    ? 'bg-gray-200 text-gray-900 hover:bg-gray-300 border-gray-300'
                    : 'border-transparent bg-transparent text-gray-900 hover:bg-gray-100'
                }`}
                onClick={toggleSelectorMode}
              >
                <MousePointer2 size={16} />
                <span className="hidden sm:inline">Inspector</span>
              </button>
            </Tooltip>
          </div>

          {/* Right side buttons */}
          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            {/* Send button */}
            <Tooltip content={isStreaming ? "Add to queue (Enter)" : "Send (Enter)"} side="top">
              <button
                type="submit"
                className="inline-flex shrink-0 cursor-pointer items-center justify-center border font-medium transition disabled:cursor-default disabled:bg-gray-100 disabled:text-gray-500 border-gray-900 bg-gray-900 text-white hover:bg-gray-800 focus:bg-gray-800 w-8 h-8 rounded-full overflow-hidden disabled:border-gray-300"
                disabled={!command.trim()}
              >
                <Send size={16} />
              </button>
            </Tooltip>
          </div>
        </div>
          </div>
        </div>
      </div>
    </form>
  );
};
