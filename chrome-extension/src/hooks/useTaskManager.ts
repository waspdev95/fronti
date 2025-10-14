import { useState, useEffect } from 'react';

export interface Task {
  id: string;
  content: string;
  isEditing: boolean;
  selectedElements: any[];
  placeholder: any;
  iframeUrl: string;
}

export const useTaskManager = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const handleAddPrompt = (e: CustomEvent) => {
      const { content, selectedElements, placeholder, iframeUrl } = e.detail;
      if (!content || !content.trim()) return;

      // Check if we've reached the maximum of 8 tasks
      if (tasks.length >= 8) {
        return;
      }

      const newTask: Task = {
        id: `task-${Date.now()}-${Math.random()}`,
        content: content.trim(),
        isEditing: false,
        selectedElements: selectedElements || [],
        placeholder: placeholder || null,
        iframeUrl: iframeUrl || 'unknown'
      };

      setTasks(prev => [...prev, newTask]);
    };

    window.addEventListener('add-prompt', handleAddPrompt as EventListener);
    return () => window.removeEventListener('add-prompt', handleAddPrompt as EventListener);
  }, [tasks.length]);

  return { tasks, setTasks };
};
