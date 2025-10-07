import React, { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const html = useMemo(() => {
    const rawHtml = marked.parse(content, { async: false }) as string;
    return DOMPurify.sanitize(rawHtml);
  }, [content]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};
