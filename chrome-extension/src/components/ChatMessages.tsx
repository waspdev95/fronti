import React, { useState } from 'react';
import { ChatMessage as ChatMessageComponent } from './ChatMessage';
import { MarkdownRenderer } from './MarkdownRenderer';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: number;
  elements?: any[];
}

interface ChatMessagesProps {
  messages: Message[];
  isStreaming: boolean;
  streamingText: string;
  projectPath: string;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isStreaming,
  streamingText,
  projectPath,
}) => {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const handleCopyMessage = (content: string, messageId: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    setTimeout(() => {
      setCopiedMessageId(null);
    }, 2000);
  };

  return (
    <>
      {(messages.length > 0 || isStreaming) && messages.map((msg) => (
        <ChatMessageComponent
          key={msg.id}
          message={msg}
          projectPath={projectPath}
          onCopyMessage={handleCopyMessage}
          copiedMessageId={copiedMessageId}
        />
      ))}

      {/* Live stream */}
      {isStreaming && streamingText && (
        <div className="flex flex-col">
          <div className="ave-message-content px-3 py-2.5 text-sm leading-relaxed break-words bg-white border border-gray-300 rounded-lg m-0 self-start w-full">
            <MarkdownRenderer content={streamingText} />
          </div>
        </div>
      )}
    </>
  );
};
