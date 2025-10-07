import React, { useRef, useEffect, useState } from 'react';
import { Send, MousePointer2, ChevronDown, ChevronRight } from 'lucide-react';
import { useAppStore } from '../store';
import { useSettings } from '../hooks/useSettings';
import { MarkdownRenderer } from './MarkdownRenderer';

export const CommandInput = () => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamContentRef = useRef<HTMLDivElement>(null);
  const [streamingText, setStreamingText] = useState<string>('');
  const streamingTextRef = useRef<string>('');
  const currentBlockRef = useRef<{ type: string; index: number; name?: string } | null>(null);
  const toolInputRef = useRef<string>('');
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

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
  } = useAppStore();

  const { settings } = useSettings();

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

    window.addEventListener('ave-set-command', handleSetCommand as EventListener);
    return () => window.removeEventListener('ave-set-command', handleSetCommand as EventListener);
  }, [setCommand]);

  // Listen for streaming messages from background
  useEffect(() => {
    const handleStreamMessage = (message: any) => {
      if (message.type === 'CLAUDE_STREAM') {
        const streamData = message.data;

        if (streamData.type === 'stream_event' && streamData.event) {
          const event = streamData.event;

          // Track content blocks
          if (event.type === 'content_block_start') {
            const blockType = event.content_block?.type;
            const toolName = event.content_block?.name;

            currentBlockRef.current = {
              type: blockType || 'unknown',
              index: event.index,
              name: toolName
            };

            // Handle text blocks
            if (blockType === 'text') {
              streamingTextRef.current = '';
              setStreamingText('');
            }
            // Handle tool_use blocks
            else if (blockType === 'tool_use') {
              toolInputRef.current = '';
            }
          }

          // Capture deltas
          else if (event.type === 'content_block_delta') {
            // Text delta
            if (event.delta?.type === 'text_delta' && event.delta?.text) {
              streamingTextRef.current += event.delta.text;
              setStreamingText(streamingTextRef.current);
            }
            // Tool input JSON delta
            else if (event.delta?.type === 'input_json_delta' && event.delta?.partial_json) {
              toolInputRef.current += event.delta.partial_json;
            }
          }

          // Save completed blocks
          else if (event.type === 'content_block_stop') {
            // Save text block
            if (currentBlockRef.current?.type === 'text' && streamingTextRef.current.trim()) {
              addAssistantMessage(streamingTextRef.current.trim());
              streamingTextRef.current = '';
              setStreamingText('');
            }
            // Save tool block
            else if (currentBlockRef.current?.type === 'tool_use' && currentBlockRef.current.name) {
              try {
                const toolParams = JSON.parse(toolInputRef.current || '{}');
                addToolMessage(currentBlockRef.current.name, toolParams);
                toolInputRef.current = '';
              } catch (e) {
                // Ignore parse errors
              }
            }
            currentBlockRef.current = null;
          }
        }
      } else if (message.type === 'CLAUDE_COMPLETE') {
        setIsStreaming(false);

        // Save any remaining text (fallback)
        if (streamingTextRef.current.trim()) {
          addAssistantMessage(streamingTextRef.current.trim());
        }

        // Reset
        streamingTextRef.current = '';
        setStreamingText('');
        toolInputRef.current = '';
        currentBlockRef.current = null;

        selectedElements.forEach(info => {
          setElementTaskState(info.element, message.success ? 'success' : 'error');
        });

        setTimeout(() => {
          selectedElements.forEach(info => {
            removeElementTask(info.element);
          });
        }, 3000);
      } else if (message.type === 'CLAUDE_ERROR') {
        setIsStreaming(false);

        if (message.error) {
          addAssistantMessage(`Error: ${message.error}`);
        }

        selectedElements.forEach(info => {
          setElementTaskState(info.element, 'error');
        });

        setTimeout(() => {
          selectedElements.forEach(info => {
            removeElementTask(info.element);
          });
        }, 3000);
      }
    };

    chrome.runtime.onMessage.addListener(handleStreamMessage);
    return () => chrome.runtime.onMessage.removeListener(handleStreamMessage);
  }, [setIsStreaming, selectedElements, setElementTaskState, removeElementTask, addAssistantMessage]);

  const handleToggleInspector = () => {
    const iframe = document.querySelector('iframe');
    if (iframe?.contentWindow) {
      if (selectorMode) {
        iframe.contentWindow.postMessage({ type: 'AVE_DEACTIVATE' }, '*');
      } else {
        iframe.contentWindow.postMessage({ type: 'AVE_ACTIVATE' }, '*');
      }
    }
    toggleSelectorMode();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  // Auto-grow textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const newHeight = Math.min(inputRef.current.scrollHeight, 200); // Max 200px
      inputRef.current.style.height = `${newHeight}px`;
    }
  }, [command]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if project path is set (required)
    if (!settings.projectPath || !settings.projectPath.trim()) {
      addAssistantMessage('Please set your project directory in Settings first.');
      return;
    }

    // Don't submit if already streaming
    if (isStreaming) return;

    if (!command.trim()) return;

    // Use current iframe URL from store (updated every second)
    const currentUrl = currentIframeUrl || 'unknown';

    let fullPrompt = '';

    if (selectedElements.length > 0) {
      const elementsInfo = selectedElements.map(info => {
        return `Element: ${info.tag}${info.id ? `#${info.id}` : ''}${info.classes ? `.${info.classes}` : ''}
Path: ${info.path}
Content: ${info.text}

Related Element Styles:
${info.css}`;
      }).join('\n\n');

      fullPrompt = `Current Page: ${currentUrl}
Page Title: ${document.title}

Related Element${selectedElements.length > 1 ? 's' : ''}:
${elementsInfo}

The user selected ${selectedElements.length > 1 ? 'these elements' : 'this element'} in the Claude visual editor tool. The element information is provided only as context. The actual task is what is written in the task section.

Task: ${command}`;
    } else {
      fullPrompt = `Task: ${command}`;
    }

    // Save user message with selected elements
    const elementsForMessage = selectedElements.map(el => ({
      tag: el.tag,
      id: el.id,
      classes: el.classes,
      path: el.path
    }));
    addUserMessage(command, elementsForMessage.length > 0 ? elementsForMessage : undefined);

    // Start streaming
    setIsStreaming(true);

    // Reset streaming state
    streamingTextRef.current = '';
    setStreamingText('');
    toolInputRef.current = '';
    currentBlockRef.current = null;

    // Check if this is the first message of the session
    const isFirstMessage = getIsFirstMessage();

    selectedElements.forEach(info => {
      setElementTaskState(info.element, 'loading');
    });

    chrome.runtime.sendMessage(
      {
        type: 'EXECUTE_CLAUDE',
        prompt: fullPrompt,
        projectPath: settings.projectPath,
        sessionId: currentSessionId,
        isFirstMessage: isFirstMessage,
      }
    );

    // Mark that a message has been sent in this session
    setMessageSent();

    setCommand('');
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
    <form onSubmit={handleSubmit} className="flex flex-col h-full gap-3">
      {/* Chat history or spacer */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-1" ref={streamContentRef}>
        {(messages.length > 0 || isStreaming) && messages.map((msg) => {
          // User messages
          if (msg.role === 'user') {
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

            return (
              <div key={msg.id} className="flex flex-col items-end animate-[messageSlideIn_0.3s_ease-out] gap-1.5">
                {msg.selectedElements && msg.selectedElements.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {msg.selectedElements.map((el, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 bg-white border border-gray-300 rounded text-[11px] font-medium text-gray-600 cursor-pointer hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                        onMouseEnter={() => handleElementHover(el.path)}
                        onMouseLeave={handleElementLeave}
                      >
                        {el.tag}{el.id ? `#${el.id}` : ''}{el.classes ? `.${el.classes.split('.')[0]}` : ''}
                      </div>
                    ))}
                  </div>
                )}
                <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium max-w-[85%] text-gray-900">{msg.content}</div>
              </div>
            );
          }

          // Tool messages
          if (msg.role === 'tool') {
            const isExpanded = expandedTools.has(msg.id);

            let toolLabel = '';
            let displayText = '';
            let dotColor = 'bg-blue-500';
            let hasDetails = false;
            let detailsContent: React.ReactNode = null;

            // Helper function to get relative path
            const getRelativePath = (filePath: string) => {
              if (!settings.projectPath || !filePath) return filePath;
              const normalizedFile = filePath.replace(/\\/g, '/').toLowerCase();
              const normalizedProject = settings.projectPath.replace(/\\/g, '/').toLowerCase();
              if (normalizedFile.startsWith(normalizedProject)) {
                return filePath.substring(settings.projectPath.length).replace(/^[/\\]/, '');
              }
              return filePath;
            };

            // Handle different tool types
            switch (msg.toolName) {
              case 'Read':
                toolLabel = 'Read';
                displayText = getRelativePath(msg.toolParams?.file_path || '');
                dotColor = 'bg-blue-500';
                break;

              case 'Edit':
              case 'Write':
                toolLabel = msg.toolName === 'Edit' ? 'Update' : 'Write';
                displayText = getRelativePath(msg.toolParams?.file_path || '');
                dotColor = 'bg-green-500';
                break;

              case 'Bash':
                toolLabel = 'Run';
                const command = msg.toolParams?.command || '';
                displayText = command.length > 40 ? command.substring(0, 40) + '...' : command;
                hasDetails = command.length > 40;
                detailsContent = (
                  <div className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded border border-gray-200 mt-1">
                    {command}
                  </div>
                );
                dotColor = 'bg-purple-500';
                break;

              case 'TodoWrite':
                toolLabel = 'Tasks';
                const todos = msg.toolParams?.todos || [];
                const todoCount = todos.length;
                displayText = `${todoCount} task${todoCount !== 1 ? 's' : ''}`;
                hasDetails = todoCount > 0;
                detailsContent = (
                  <div className="text-xs text-gray-700 mt-1 space-y-1.5">
                    {todos.map((todo: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 p-2 bg-white rounded border border-gray-200">
                        <span className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded border mt-0.5 flex-shrink-0 ${
                          todo.status === 'completed'
                            ? 'bg-green-500 border-green-500'
                            : todo.status === 'in_progress'
                            ? 'bg-blue-500 border-blue-500'
                            : 'bg-white border-gray-300'
                        }`}>
                          {todo.status === 'completed' && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {todo.status === 'in_progress' && (
                            <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                          )}
                        </span>
                        <span className="flex-1">{todo.content}</span>
                      </div>
                    ))}
                  </div>
                );
                dotColor = 'bg-orange-500';
                break;

              case 'Grep':
                toolLabel = 'Search';
                displayText = msg.toolParams?.pattern || '';
                hasDetails = !!msg.toolParams?.path;
                detailsContent = msg.toolParams?.path && (
                  <div className="text-xs text-gray-500 mt-1">
                    in: {getRelativePath(msg.toolParams.path)}
                  </div>
                );
                dotColor = 'bg-cyan-500';
                break;

              case 'Glob':
                toolLabel = 'Find';
                displayText = msg.toolParams?.pattern || '';
                hasDetails = !!msg.toolParams?.path;
                detailsContent = msg.toolParams?.path && (
                  <div className="text-xs text-gray-500 mt-1">
                    in: {getRelativePath(msg.toolParams.path)}
                  </div>
                );
                dotColor = 'bg-indigo-500';
                break;

              default:
                toolLabel = msg.toolName || 'Tool';
                displayText = JSON.stringify(msg.toolParams || {});
                dotColor = 'bg-gray-500';
            }

            const toggleExpand = () => {
              const newExpanded = new Set(expandedTools);
              if (isExpanded) {
                newExpanded.delete(msg.id);
              } else {
                newExpanded.add(msg.id);
              }
              setExpandedTools(newExpanded);
            };

            return (
              <div key={msg.id} className="flex flex-col animate-[messageSlideIn_0.3s_ease-out]">
                <div
                  className={`py-1 m-0 max-w-[85%] self-start flex items-center gap-1.5 ${hasDetails ? 'cursor-pointer hover:bg-gray-50 px-1 rounded transition-colors' : ''}`}
                  onClick={hasDetails ? toggleExpand : undefined}
                >
                  {hasDetails && (
                    isExpanded ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />
                  )}
                  <span className={`w-1 h-1 ${dotColor} rounded-full flex-shrink-0`}></span>
                  <span className="text-[11px] font-medium text-gray-500">{toolLabel}</span>
                  <span className="text-[11px] text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap">{displayText}</span>
                </div>
                {isExpanded && hasDetails && (
                  <div className="max-w-[85%] self-start pl-5">
                    {detailsContent}
                  </div>
                )}
              </div>
            );
          }

          // Assistant messages
          return (
            <div key={msg.id} className="flex flex-col animate-[messageSlideIn_0.3s_ease-out]">
              <div className="ave-message-content px-3 py-2.5 text-xs leading-relaxed break-words bg-white border border-gray-300 rounded-lg m-0 max-w-[85%] self-start">
                <MarkdownRenderer content={msg.content} />
              </div>
            </div>
          );
        })}

        {/* Live stream */}
        {isStreaming && streamingText && (
          <div className="flex flex-col animate-[messageSlideIn_0.3s_ease-out]">
            <div className="ave-message-content px-3 py-2.5 text-xs leading-relaxed break-words bg-white border border-gray-300 rounded-lg m-0 max-w-[85%] self-start">
              <MarkdownRenderer content={streamingText} />
            </div>
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {isStreaming && (
        <div className="flex items-center py-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-[dotPulse_1.4s_ease-in-out_infinite]"></span>
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-[dotPulse_1.4s_ease-in-out_0.2s_infinite]"></span>
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-[dotPulse_1.4s_ease-in-out_0.4s_infinite]"></span>
          </div>
        </div>
      )}

      {/* Selected Elements Badges */}
      {selectedElements.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedElements.map((el, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-300 rounded-md text-xs font-medium text-gray-700"
            >
              <span>{el.tag}{el.id ? `#${el.id}` : ''}{el.classes ? `.${el.classes.split('.')[0]}` : ''}</span>
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
      )}

      <div className="p-3 z-20 relative rounded-xl overflow-visible bg-white border border-gray-300 focus-within:border-gray-500 shadow-sm transition-[border-color,box-shadow] duration-200">
        {/* Textarea */}
        <div className="w-full overflow-y-auto max-h-[200px] min-h-[44px] pb-2">
          <textarea
            ref={inputRef}
            className="w-full text-sm resize-none border-0 outline-none bg-transparent placeholder:text-gray-400 disabled:opacity-50 overflow-hidden"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a follow-up..."
            rows={1}
            style={{ minHeight: '44px', height: '44px' }}
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1">
          {/* Left side buttons */}
          <div className="flex items-end gap-0.5 sm:gap-1 flex-1">
            {/* Inspector Mode Toggle */}
            <button
              type="button"
              className={`inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 border font-medium transition px-2 text-sm h-7 rounded-md ${
                selectorMode
                  ? 'bg-gray-900 text-white hover:bg-gray-800'
                  : 'border-transparent bg-transparent text-gray-900 hover:bg-gray-100'
              }`}
              onClick={handleToggleInspector}
              title={selectorMode ? "Inspector Mode: ON" : "Inspector Mode: OFF"}
            >
              <MousePointer2 size={16} />
              <span className="hidden sm:inline">Inspector</span>
            </button>
          </div>

          {/* Right side buttons */}
          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            {/* Send button */}
            <button
              type="submit"
              className="inline-flex shrink-0 cursor-pointer items-center justify-center border font-medium transition disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 border-gray-900 bg-gray-900 text-white hover:bg-gray-800 focus:bg-gray-800 text-sm px-2.5 h-7 rounded-md overflow-hidden disabled:border-gray-300"
              disabled={!command.trim() || isStreaming}
              title="Send"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};
