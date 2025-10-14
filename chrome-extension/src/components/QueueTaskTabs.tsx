import React, { useState } from 'react';
import { QueueItem } from './QueueItem';
import { TasksPanel } from './TasksPanel';
import { Task } from '../hooks/useTaskManager';

interface QueueTaskTabsProps {
  taskQueue: any[];
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  editingTaskId: string | null;
  editingText: string;
  onEditTextChange: (text: string) => void;
  onElementHover: (path: string) => void;
  onElementLeave: () => void;
  onEditClick: (task: any) => void;
  onSaveClick: (taskId: string) => void;
  onCancelClick: (taskId: string) => void;
  onMoveToTask: (task: any) => void;
  onDeleteClick: (taskId: string) => void;
  onQueueTask: (content: string, selectedElements: any[], placeholder: any, iframeUrl: string) => void;
  isStreaming: boolean;
}

export const QueueTaskTabs: React.FC<QueueTaskTabsProps> = ({
  taskQueue,
  tasks,
  setTasks,
  editingTaskId,
  editingText,
  onEditTextChange,
  onElementHover,
  onElementLeave,
  onEditClick,
  onSaveClick,
  onCancelClick,
  onMoveToTask,
  onDeleteClick,
  onQueueTask,
  isStreaming,
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'tasks'>('queue');

  if (taskQueue.length === 0 && tasks.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Tab Bar */}
      <div className="flex items-center gap-1 border-b border-gray-200 pb-1">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-3 py-1.5 text-sm font-medium rounded-t transition-colors ${
            activeTab === 'queue'
              ? 'bg-white text-gray-900 border border-b-0 border-gray-300'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Queue {taskQueue.length > 0 && `(${taskQueue.length})`}
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-3 py-1.5 text-sm font-medium rounded-t transition-colors ${
            activeTab === 'tasks'
              ? 'bg-white text-gray-900 border border-b-0 border-gray-300'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Tasks {tasks.length > 0 && `(${tasks.length})`}
        </button>
      </div>

      {/* Queue Tab Content */}
      {activeTab === 'queue' && (
        taskQueue.length > 0 ? (
          <div className="flex flex-col gap-2">
            {taskQueue.map((task, index) => (
              <QueueItem
                key={task.id}
                task={task}
                index={index}
                isEditing={editingTaskId === task.id}
                editingText={editingText}
                onEditTextChange={onEditTextChange}
                onElementHover={onElementHover}
                onElementLeave={onElementLeave}
                onEditClick={() => onEditClick(task)}
                onSaveClick={() => onSaveClick(task.id)}
                onCancelClick={() => onCancelClick(task.id)}
                onMoveToTask={() => onMoveToTask(task)}
                onDeleteClick={() => onDeleteClick(task.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-sm text-gray-500 py-4">
            No queued tasks.
          </div>
        )
      )}

      {/* Tasks Tab Content */}
      {activeTab === 'tasks' && (
        <TasksPanel
          tasks={tasks}
          setTasks={setTasks}
          onQueueTask={onQueueTask}
          isStreaming={isStreaming}
        />
      )}
    </div>
  );
};
