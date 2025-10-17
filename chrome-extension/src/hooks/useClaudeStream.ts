/**
 * Hook for handling Claude AI streaming responses
 */

import React, { useEffect, useRef } from 'react';

interface StreamHandlers {
  setIsStreaming: (streaming: boolean) => void;
  addAssistantMessage: (message: string) => void;
  addToolMessage: (toolName: string, toolParams: any) => void;
  getNextQueueItem: () => any;
  removeFromQueue: (id: string) => void;
  isAnyQueueItemEditing: () => boolean;
  executeTask: ((command: string, elements: any[], url: string) => void) | null;
}

export function useClaudeStream(
  streamingTextRef: React.MutableRefObject<string>,
  setStreamingText: (text: string) => void,
  currentBlockRef: React.MutableRefObject<{ type: string; index: number; name?: string } | null>,
  toolInputRef: React.MutableRefObject<string>,
  handlersRef: React.MutableRefObject<StreamHandlers>
) {
  // Track processed blocks to prevent duplicates
  const processedBlocksRef = React.useRef(new Set<string>());
  const currentMessageIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    const handleStreamMessage = (message: any) => {
      if (message.type === 'CLAUDE_STREAM') {
        const streamData = message.data;

        if (streamData.type === 'stream_event' && streamData.event) {
          const event = streamData.event;

          if (event.type === 'message_start') {
            currentMessageIdRef.current =
              event.message?.id ??
              event.message_id ??
              `${Date.now()}-${Math.random()}`;

            processedBlocksRef.current.clear();
            streamingTextRef.current = '';
            setStreamingText('');
            toolInputRef.current = '';
            currentBlockRef.current = null;
            return;
          }

          // Track content blocks
          if (event.type === 'content_block_start') {
            const blockType = event.content_block?.type;
            const toolName = event.content_block?.name;

            currentBlockRef.current = {
              type: blockType || 'unknown',
              index: event.index,
              name: toolName
            };

            if (blockType === 'text') {
              streamingTextRef.current = '';
              setStreamingText('');
            } else if (blockType === 'tool_use') {
              toolInputRef.current = '';
            }
          }
          // Capture deltas
          else if (event.type === 'content_block_delta') {
            if (event.delta?.type === 'text_delta' && event.delta?.text) {
              streamingTextRef.current += event.delta.text;
              setStreamingText(streamingTextRef.current);
            } else if (event.delta?.type === 'input_json_delta' && event.delta?.partial_json) {
              toolInputRef.current += event.delta.partial_json;
            }
          }
          // Save completed blocks
          else if (event.type === 'content_block_stop') {
            const messageId = currentMessageIdRef.current ?? 'default';
            const blockType = currentBlockRef.current?.type ?? 'unknown';
            const blockKey = `${messageId}:${event.index}-${blockType}`;

            // Skip if already processed
            if (processedBlocksRef.current.has(blockKey)) {
              return;
            }

            if (currentBlockRef.current?.type === 'text' && streamingTextRef.current.trim()) {
              handlersRef.current.addAssistantMessage(streamingTextRef.current.trim());
              processedBlocksRef.current.add(blockKey);
              streamingTextRef.current = '';
              setStreamingText('');
            } else if (currentBlockRef.current?.type === 'tool_use' && currentBlockRef.current.name) {
              try {
                const toolParams = JSON.parse(toolInputRef.current || '{}');
                handlersRef.current.addToolMessage(currentBlockRef.current.name, toolParams);
                processedBlocksRef.current.add(blockKey);
                toolInputRef.current = '';
              } catch (e) {
                // Ignore parse errors
              }
            }
            currentBlockRef.current = null;
          }
        }
      } else if (message.type === 'CLAUDE_COMPLETE') {
        handlersRef.current.setIsStreaming(false);
        currentMessageIdRef.current = null;

        // Save any remaining text (only if not already saved)
        if (streamingTextRef.current.trim()) {
          handlersRef.current.addAssistantMessage(streamingTextRef.current.trim());
        }

        // Reset
        streamingTextRef.current = '';
        setStreamingText('');
        toolInputRef.current = '';
        currentBlockRef.current = null;
        processedBlocksRef.current.clear(); // Clear for next session

        // Execute next queued task if not editing
        const isEditing = handlersRef.current.isAnyQueueItemEditing();
        if (!isEditing) {
          const nextTask = handlersRef.current.getNextQueueItem();
          if (nextTask && handlersRef.current.executeTask) {
            handlersRef.current.removeFromQueue(nextTask.id);

            setTimeout(() => {
              const taskElements = nextTask.selectedElements.map((el: any) => ({
                ...el,
                element: null as any
              }));

              handlersRef.current.executeTask!(nextTask.command, taskElements, nextTask.iframeUrl);
            }, 100);
          }
        }
      } else if (message.type === 'CLAUDE_ERROR') {
        handlersRef.current.setIsStreaming(false);
        currentMessageIdRef.current = null;

        if (message.error) {
          handlersRef.current.addAssistantMessage(`Error: ${message.error}`);
        }

        // Execute next task even after error
        const isEditing = handlersRef.current.isAnyQueueItemEditing();
        if (!isEditing) {
          const nextTask = handlersRef.current.getNextQueueItem();
          if (nextTask && handlersRef.current.executeTask) {
            handlersRef.current.removeFromQueue(nextTask.id);

            setTimeout(() => {
              const taskElements = nextTask.selectedElements.map((el: any) => ({
                ...el,
                element: null as any
              }));

              handlersRef.current.executeTask!(nextTask.command, taskElements, nextTask.iframeUrl);
            }, 100);
          }
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleStreamMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleStreamMessage);
    };
  }, []); // Empty dependency array - listener added only ONCE
}
