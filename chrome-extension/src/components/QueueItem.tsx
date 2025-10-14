import React from 'react';
import { Edit2, Trash2, ListTodo } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { getElementDisplayText } from '../utils/element-display';
import { useAppStore } from '../store';

interface QueueItemProps {
  task: any;
  index: number;
  isEditing: boolean;
  editingText: string;
  onEditTextChange: (text: string) => void;
  onElementHover: (path: string) => void;
  onElementLeave: () => void;
  onEditClick: () => void;
  onSaveClick: () => void;
  onCancelClick: () => void;
  onMoveToTask: () => void;
  onDeleteClick: () => void;
}

export const QueueItem: React.FC<QueueItemProps> = ({
  task,
  index,
  isEditing,
  editingText,
  onEditTextChange,
  onElementHover,
  onElementLeave,
  onEditClick,
  onSaveClick,
  onCancelClick,
  onMoveToTask,
  onDeleteClick,
}) => {
  const { toggleQueueItemExpanded } = useAppStore();

  const shortCommand = task.command.length > 60
    ? task.command.substring(0, 60) + '...'
    : task.command;
  const hasMore = task.command.length > 60;

  return (
    <div
      key={task.id}
      className="flex flex-col gap-2 p-3 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors min-w-0"
    >
      <div className="flex items-center gap-2 flex-wrap justify-between">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <span className="inline-flex items-center px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">
            Queued {index + 1}
          </span>
          {task.selectedElements.length > 0 && !isEditing && (
            <div className="flex flex-wrap gap-1.5">
              {task.selectedElements.map((el: any, idx: number) => (
                <div
                  key={idx}
                  className="inline-flex items-center px-2 py-0.5 bg-white border border-gray-300 rounded text-[13px] font-medium text-gray-600 cursor-pointer hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                  onMouseEnter={() => onElementHover(el.path)}
                  onMouseLeave={onElementLeave}
                >
                  {getElementDisplayText(el)}
                </div>
              ))}
            </div>
          )}
        </div>
        {!isEditing && (
          <div className="flex items-center gap-1">
            <Tooltip content="Move to Tasks">
              <button
                onClick={onMoveToTask}
                className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-600 hover:text-gray-900"
              >
                <ListTodo size={14} />
              </button>
            </Tooltip>
            <Tooltip content="Edit">
              <button
                onClick={onEditClick}
                className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-600 hover:text-gray-900"
              >
                <Edit2 size={14} />
              </button>
            </Tooltip>
            <Tooltip content="Delete">
              <button
                onClick={onDeleteClick}
                className="p-1 hover:bg-gray-100 rounded transition-colors text-red-600 hover:text-red-700"
              >
                <Trash2 size={14} />
              </button>
            </Tooltip>
          </div>
        )}
      </div>
      {isEditing ? (
        <div className="p-3 rounded-xl bg-white border border-gray-300 focus-within:border-gray-500 shadow-sm transition-[border-color,box-shadow] duration-200">
          <div className="w-full overflow-y-auto max-h-[200px] min-h-[44px] pb-2">
            <textarea
              value={editingText}
              onChange={(e) => onEditTextChange(e.target.value)}
              className="w-full text-sm resize-none border-0 outline-none bg-transparent placeholder:text-gray-400 overflow-hidden"
              placeholder="Edit task..."
              rows={3}
              autoFocus
              style={{ minHeight: '44px' }}
            />
          </div>
          <div className="flex items-center gap-1 justify-end">
            <button
              onClick={onCancelClick}
              className="inline-flex shrink-0 cursor-pointer items-center justify-center border font-medium transition hover:bg-gray-100 border-transparent bg-transparent text-gray-900 px-2 text-sm h-7 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={onSaveClick}
              className="inline-flex shrink-0 cursor-pointer items-center justify-center border font-medium transition border-gray-900 bg-gray-900 text-white hover:bg-gray-800 focus:bg-gray-800 px-3 text-sm h-7 rounded-md"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <div
          className="text-sm text-gray-700 font-medium whitespace-pre-wrap break-words"
          onClick={() => hasMore && toggleQueueItemExpanded(task.id)}
          style={{ cursor: hasMore ? 'pointer' : 'default' }}
        >
          {task.isExpanded || !hasMore ? task.command : shortCommand}
        </div>
      )}
    </div>
  );
};
