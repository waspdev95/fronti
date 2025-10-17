/**
 * Chat message component
 * Renders user messages, assistant messages, and tool usage messages
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Check, Copy } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Tooltip } from './Tooltip';
import { getElementDisplayText } from '../utils/element-display';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  selectedElements?: any[];
  toolName?: string;
  toolParams?: any;
}

interface ChatMessageProps {
  message: Message;
  projectPath?: string;
  onCopyMessage: (content: string, messageId: string) => void;
  copiedMessageId: string | null;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  projectPath,
  onCopyMessage,
  copiedMessageId
}) => {
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

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

  // User message
  if (message.role === 'user') {
    return (
      <div className="flex flex-col items-end gap-1.5">
        {message.selectedElements && message.selectedElements.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-end">
            {message.selectedElements.map((el, idx) => (
              <div
                key={idx}
                className="inline-flex items-center px-2 py-0.5 bg-white border border-gray-300 rounded text-[13px] font-medium text-gray-600 cursor-pointer hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                onMouseEnter={() => handleElementHover(el.path)}
                onMouseLeave={handleElementLeave}
              >
                {getElementDisplayText(el)}
              </div>
            ))}
          </div>
        )}
        <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  // Tool message
  if (message.role === 'tool') {
    const isExpanded = expandedTools.has(message.id);

    const getRelativePath = (filePath: string) => {
      if (!projectPath || !filePath) return filePath;
      const normalizedFile = filePath.replace(/\\/g, '/').toLowerCase();
      const normalizedProject = projectPath.replace(/\\/g, '/').toLowerCase();
      if (normalizedFile.startsWith(normalizedProject)) {
        return filePath.substring(projectPath.length).replace(/^[/\\]/, '');
      }
      return filePath;
    };

    let toolLabel = '';
    let displayText = '';
    let dotColor = 'bg-blue-500';
    let hasDetails = false;
    let detailsContent: React.ReactNode = null;

    switch (message.toolName) {
      case 'Read':
        toolLabel = 'Read';
        displayText = getRelativePath(message.toolParams?.file_path || '');
        dotColor = 'bg-blue-500';
        break;

      case 'Edit':
      case 'Write':
        toolLabel = message.toolName === 'Edit' ? 'Update' : 'Write';
        displayText = getRelativePath(message.toolParams?.file_path || '');
        dotColor = 'bg-green-500';
        break;

      case 'Bash': {
        toolLabel = 'Run';
        const command = message.toolParams?.command || '';
        displayText = command.length > 40 ? command.substring(0, 40) + '...' : command;
        hasDetails = command.length > 40;
        detailsContent = (
          <div className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded border border-gray-200 mt-1">
            {command}
          </div>
        );
        dotColor = 'bg-purple-500';
        break;
      }

      case 'TodoWrite': {
        toolLabel = 'Tasks';
        const todos = message.toolParams?.todos || [];
        const todoCount = todos.length;
        displayText = `${todoCount} task${todoCount !== 1 ? 's' : ''}`;
        hasDetails = todoCount > 0;
        detailsContent = (
          <div className="text-sm text-gray-700 mt-1 space-y-1.5">
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
      }

      case 'Grep':
        toolLabel = 'Search';
        displayText = message.toolParams?.pattern || '';
        hasDetails = !!message.toolParams?.path;
        detailsContent = message.toolParams?.path && (
          <div className="text-sm text-gray-500 mt-1">
            in: {getRelativePath(message.toolParams.path)}
          </div>
        );
        dotColor = 'bg-cyan-500';
        break;

      case 'Glob':
        toolLabel = 'Find';
        displayText = message.toolParams?.pattern || '';
        hasDetails = !!message.toolParams?.path;
        detailsContent = message.toolParams?.path && (
          <div className="text-sm text-gray-500 mt-1">
            in: {getRelativePath(message.toolParams.path)}
          </div>
        );
        dotColor = 'bg-indigo-500';
        break;

      default:
        toolLabel = message.toolName || 'Tool';
        displayText = JSON.stringify(message.toolParams || {});
        dotColor = 'bg-gray-500';
    }

    const toggleExpand = () => {
      const newExpanded = new Set(expandedTools);
      if (isExpanded) {
        newExpanded.delete(message.id);
      } else {
        newExpanded.add(message.id);
      }
      setExpandedTools(newExpanded);
    };

    return (
      <div className="flex flex-col">
        <div
          className={`py-1 m-0 self-start flex items-center gap-1.5 ${hasDetails ? 'cursor-pointer hover:bg-gray-50 px-1 rounded transition-colors' : ''}`}
          onClick={hasDetails ? toggleExpand : undefined}
        >
          {hasDetails && (
            isExpanded ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />
          )}
          <span className={`w-1 h-1 ${dotColor} rounded-full flex-shrink-0`}></span>
          <span className="text-[13px] font-medium text-gray-500">{toolLabel}</span>
          <span className="text-[13px] text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap">{displayText}</span>
        </div>
        {isExpanded && hasDetails && (
          <div className="self-start pl-5">
            {detailsContent}
          </div>
        )}
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex flex-col gap-1 self-start">
      <div className="ave-message-content px-3 py-2.5 text-sm leading-relaxed break-words bg-white border border-gray-300 rounded-lg m-0 w-full">
        <MarkdownRenderer content={message.content} />
      </div>
      <Tooltip content={copiedMessageId === message.id ? "Copied!" : "Copy message"}>
        <button
          onClick={() => onCopyMessage(message.content, message.id)}
          className="self-start p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-all"
        >
          {copiedMessageId === message.id ? (
            <Check size={14} className="text-green-600" />
          ) : (
            <Copy size={14} />
          )}
        </button>
      </Tooltip>
    </div>
  );
};
