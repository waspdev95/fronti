import React, { useState } from 'react';
import { Plus, Play, Edit2, Trash2, Check, X, ChevronDown, ListPlus } from 'lucide-react';
import { getElementDisplayText } from '../utils/element-display';
import { Tooltip } from './Tooltip';

interface Task {
  id: string;
  content: string;
  isEditing: boolean;
  selectedElements: Array<{
    tag: string;
    id: string;
    classes: string;
    path: string;
    text: string;
    url: string;
    css: string;
  }>;
  placeholder: {
    position: 'top' | 'right' | 'bottom' | 'left';
    relativeToElement: {
      tag: string;
      id: string;
      classes: string;
      path: string;
    };
    placeholderId: string;
  } | null;
  iframeUrl: string;
}

interface TasksPanelProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onQueueTask: (content: string, selectedElements: any[], placeholder: any, iframeUrl: string) => void;
  isStreaming: boolean;
}

export const TasksPanel = ({ tasks, setTasks, onQueueTask, isStreaming }: TasksPanelProps) => {

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleStartEdit = (id: string) => {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, isEditing: true } : t
    ));
  };

  const handleSaveEdit = (id: string, newContent: string) => {
    if (!newContent.trim()) {
      handleDeleteTask(id);
      return;
    }

    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, content: newContent.trim(), isEditing: false } : t
    ));
  };

  const handleCancelEdit = (id: string) => {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, isEditing: false } : t
    ));
  };

  const handleQueueTask = (task: Task) => {
    onQueueTask(task.content, task.selectedElements, task.placeholder, task.iframeUrl);
    handleDeleteTask(task.id);
  };

  return (
    <div className="w-full h-full flex flex-col bg-transparent overflow-hidden">
      {/* Tasks List */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-4">
              No tasks.
            </div>
          ) : (
            tasks.map((task, index) => (
              <TaskItem
                key={task.id}
                task={task}
                index={index}
                onQueue={() => handleQueueTask(task)}
                onEdit={() => handleStartEdit(task.id)}
                onSave={(content) => handleSaveEdit(task.id, content)}
                onCancel={() => handleCancelEdit(task.id)}
                onDelete={() => handleDeleteTask(task.id)}
                isStreaming={isStreaming}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

interface TaskItemProps {
  task: Task;
  index: number;
  onQueue: () => void;
  onEdit: () => void;
  onSave: (content: string) => void;
  onCancel: () => void;
  onDelete: () => void;
  isStreaming: boolean;
}

const TaskItem = ({ task, index, onQueue, onEdit, onSave, onCancel, onDelete, isStreaming }: TaskItemProps) => {
  const [editContent, setEditContent] = useState(task.content);
  const editRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (task.isEditing && editRef.current) {
      editRef.current.textContent = task.content;
      editRef.current.focus();

      // Highlight elements when editing starts
      if (task.selectedElements.length > 0) {
        const iframe = document.querySelector('iframe');
        task.selectedElements.forEach(el => {
          if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage({
              type: 'AVE_HIGHLIGHT_ELEMENT',
              path: el.path
            }, '*');
          }
        });
      }
      if (task.placeholder) {
        const iframe = document.querySelector('iframe');
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({
            type: 'AVE_HIGHLIGHT_ELEMENT',
            path: task.placeholder.relativeToElement.path
          }, '*');
        }
      }
    } else if (!task.isEditing) {
      // Clear highlights when editing ends
      const iframe = document.querySelector('iframe');
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'AVE_CLEAR_HIGHLIGHT'
        }, '*');
      }
    }
  }, [task.isEditing, task.content, task.selectedElements, task.placeholder]);

  const handleEditInput = (e: React.FormEvent<HTMLDivElement>) => {
    setEditContent(e.currentTarget.textContent || '');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave(editContent);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

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

  if (task.isEditing) {
    return (
      <div className="p-3 bg-white border border-emerald-300 rounded-md shadow-sm">
        {/* Header: Task badge and elements */}
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {/* Task number badge */}
          <span className="inline-flex items-center px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-xs font-semibold">
            Task {index + 1}
          </span>

          {/* Show placeholder badge if exists */}
          {task.placeholder && (
            <>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-300 rounded text-xs font-medium text-blue-700">
                <span>
                  {task.placeholder.position === 'top' ? 'Add an element above' :
                   task.placeholder.position === 'bottom' ? 'Add an element below' :
                   task.placeholder.position === 'left' ? 'Add an element to the left of' :
                   'Add an element to the right of'}
                </span>
              </div>
              <div
                className="inline-flex items-center px-2 py-0.5 bg-white border border-gray-300 rounded text-xs font-medium text-gray-600 cursor-pointer hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                onMouseEnter={() => handleElementHover(task.placeholder!.relativeToElement.path)}
                onMouseLeave={handleElementLeave}
              >
                {getElementDisplayText(task.placeholder.relativeToElement)}
              </div>
            </>
          )}

          {/* Show selected elements if exists */}
          {task.selectedElements.length > 0 && !task.placeholder && (
            <>
              {task.selectedElements.map((el, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center px-2 py-0.5 bg-white border border-gray-300 rounded text-xs font-medium text-gray-600 cursor-pointer hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                  onMouseEnter={() => handleElementHover(el.path)}
                  onMouseLeave={handleElementLeave}
                >
                  {getElementDisplayText(el)}
                </div>
              ))}
            </>
          )}
        </div>

        <div className="p-3 rounded-xl bg-white border border-gray-300 focus-within:border-gray-500 shadow-sm transition-[border-color,box-shadow] duration-200">
          <div className="w-full overflow-y-auto max-h-[200px] min-h-[44px] pb-2">
            <div
              ref={editRef}
              contentEditable
              onInput={handleEditInput}
              onKeyDown={handleEditKeyDown}
              className="w-full text-sm resize-none border-0 outline-none bg-transparent overflow-hidden min-h-[44px]"
              style={{ minHeight: '44px' }}
            />
          </div>
          <div className="flex items-center gap-1 justify-end">
            <button
              onClick={onCancel}
              className="inline-flex shrink-0 cursor-pointer items-center justify-center border font-medium transition hover:bg-gray-100 border-transparent bg-transparent text-gray-900 px-2 text-sm h-7 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(editContent)}
              className="inline-flex shrink-0 cursor-pointer items-center justify-center border font-medium transition border-gray-900 bg-gray-900 text-white hover:bg-gray-800 focus:bg-gray-800 px-3 text-sm h-7 rounded-md"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 bg-white border border-gray-200 rounded-md hover:border-gray-300 transition-all shadow-sm min-w-0">
      {/* Header: Task badge, elements, and action buttons */}
      <div className="flex items-start justify-between gap-2 mb-2">
        {/* Left side: Task badge and elements */}
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          {/* Task number badge */}
          <span className="inline-flex items-center px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-xs font-semibold">
            Task {index + 1}
          </span>

          {/* Show placeholder badge if exists */}
          {task.placeholder && (
            <>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-300 rounded text-xs font-medium text-blue-700">
                <span>
                  {task.placeholder.position === 'top' ? 'Add an element above' :
                   task.placeholder.position === 'bottom' ? 'Add an element below' :
                   task.placeholder.position === 'left' ? 'Add an element to the left of' :
                   'Add an element to the right of'}
                </span>
              </div>
              <div
                className="inline-flex items-center px-2 py-0.5 bg-white border border-gray-300 rounded text-xs font-medium text-gray-600 cursor-pointer hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                onMouseEnter={() => handleElementHover(task.placeholder!.relativeToElement.path)}
                onMouseLeave={handleElementLeave}
              >
                {getElementDisplayText(task.placeholder.relativeToElement)}
              </div>
            </>
          )}

          {/* Show selected elements if exists */}
          {task.selectedElements.length > 0 && !task.placeholder && (
            <>
              {task.selectedElements.map((el, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center px-2 py-0.5 bg-white border border-gray-300 rounded text-xs font-medium text-gray-600 cursor-pointer hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                  onMouseEnter={() => handleElementHover(el.path)}
                  onMouseLeave={handleElementLeave}
                >
                  {getElementDisplayText(el)}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Right side: Run, Edit and Delete buttons - always visible */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Tooltip content={isStreaming ? "Add to Queue" : "Run Task"}>
            <button
              onClick={onQueue}
              className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-600 hover:text-gray-900"
            >
              {isStreaming ? <ListPlus size={14} /> : <Play size={14} />}
            </button>
          </Tooltip>
          <Tooltip content="Edit">
            <button
              onClick={onEdit}
              className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-600 hover:text-gray-900"
            >
              <Edit2 size={14} />
            </button>
          </Tooltip>
          <Tooltip content="Delete">
            <button
              onClick={onDelete}
              className="p-1 hover:bg-gray-100 rounded transition-colors text-red-600 hover:text-red-700"
            >
              <Trash2 size={14} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Task content */}
      <div className="text-sm text-gray-900 whitespace-pre-wrap break-words">
        {task.content}
      </div>
    </div>
  );
};
