import { create } from 'zustand';

export interface ElementInfo {
  tag: string;
  id: string;
  classes: string;
  path: string;
  text: string;
  url: string;
  element: HTMLElement;
  css: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: number;
  toolName?: string;
  toolParams?: Record<string, any>;
  selectedElements?: Array<{
    tag: string;
    id: string;
    classes: string;
    path: string;
  }>;
}

export interface ChatSession {
  id: string;
  isFirstMessage: boolean;
  messages: ChatMessage[];
}

export interface QueuedTask {
  id: string;
  command: string;
  selectedElements: Array<{
    tag: string;
    id: string;
    classes: string;
    path: string;
    text: string;
    url: string;
    css: string;
  }>;
  iframeUrl: string;
  isExpanded: boolean;
  isEditing: boolean;
  timestamp: number;
}

export interface PlaceholderInfo {
  position: 'top' | 'right' | 'bottom' | 'left';
  relativeToElement: {
    tag: string;
    id: string;
    classes: string;
    path: string;
  };
  placeholderId: string;
}

interface AppState {
  selectedElements: ElementInfo[];
  selectorMode: boolean;
  command: string;
  isStreaming: boolean;
  currentSessionId: string | null;
  sessions: ChatSession[];
  currentIframeUrl: string;
  taskQueue: QueuedTask[];
  placeholder: PlaceholderInfo | null;

  addSelectedElement: (info: ElementInfo) => void;
  removeSelectedElementByIndex: (index: number) => void;
  clearSelectedElements: () => void;
  toggleSelectorMode: () => void;
  setCommand: (command: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  startNewSession: () => void;
  loadSessionsFromStorage: () => void;
  saveSessionsToStorage: () => void;
  getIsFirstMessage: () => boolean;
  setMessageSent: () => void;
  addUserMessage: (content: string, selectedElements?: Array<{tag: string; id: string; classes: string; path: string}>) => void;
  addAssistantMessage: (content: string) => void;
  addToolMessage: (toolName: string, toolParams: Record<string, any>) => void;
  getCurrentMessages: () => ChatMessage[];
  setCurrentIframeUrl: (url: string) => void;
  addToQueue: (command: string, selectedElements: ElementInfo[], iframeUrl: string) => void;
  removeFromQueue: (id: string) => void;
  getNextQueueItem: () => QueuedTask | null;
  toggleQueueItemExpanded: (id: string) => void;
  startEditingQueueItem: (id: string) => void;
  updateQueueItemCommand: (id: string, newCommand: string) => void;
  cancelEditingQueueItem: (id: string) => void;
  isAnyQueueItemEditing: () => boolean;
  setPlaceholder: (placeholder: PlaceholderInfo) => void;
  clearPlaceholder: () => void;
}

// Helper to generate UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const useAppStore = create<AppState>((set, get) => ({
  selectedElements: [],
  selectorMode: false,
  command: '',
  isStreaming: false,
  currentSessionId: null,
  sessions: [],
  currentIframeUrl: '',
  taskQueue: [],
  placeholder: null,

  addSelectedElement: (info) =>
    set((state) => {
      const exists = state.selectedElements.some(e => e.element === info.element);
      if (exists) {
        return { selectedElements: state.selectedElements.filter(e => e.element !== info.element) };
      }
      return { selectedElements: [...state.selectedElements, info] };
    }),

  removeSelectedElementByIndex: (index) =>
    set((state) => ({
      selectedElements: state.selectedElements.filter((_, i) => i !== index)
    })),

  clearSelectedElements: () =>
    set({ selectedElements: [], command: '', placeholder: null }),

  toggleSelectorMode: () =>
    set((state) => ({ selectorMode: !state.selectorMode })),

  setCommand: (command) =>
    set({ command }),

  setIsStreaming: (streaming) =>
    set({ isStreaming: streaming }),

  startNewSession: () => {
    const newSessionId = generateUUID();
    const newSession: ChatSession = {
      id: newSessionId,
      isFirstMessage: true,
      messages: []
    };

    set((state) => ({
      currentSessionId: newSessionId,
      sessions: [...state.sessions, newSession]
    }));

    get().saveSessionsToStorage();
  },

  loadSessionsFromStorage: () => {
    try {
      const stored = localStorage.getItem('ave-sessions');
      const currentId = localStorage.getItem('ave-current-session');

      if (stored) {
        const sessions = JSON.parse(stored);
        set({
          sessions,
          currentSessionId: currentId
        });
      }
    } catch (e) {
      console.error('Failed to load sessions:', e);
    }
  },

  saveSessionsToStorage: () => {
    try {
      const state = get();
      localStorage.setItem('ave-sessions', JSON.stringify(state.sessions));
      if (state.currentSessionId) {
        localStorage.setItem('ave-current-session', state.currentSessionId);
      }
    } catch (e) {
      console.error('Failed to save sessions:', e);
    }
  },

  getIsFirstMessage: () => {
    const state = get();
    if (!state.currentSessionId) return true;

    const currentSession = state.sessions.find(s => s.id === state.currentSessionId);
    return currentSession?.isFirstMessage ?? true;
  },

  setMessageSent: () => {
    const state = get();
    if (!state.currentSessionId) return;

    set((s) => ({
      sessions: s.sessions.map(session =>
        session.id === state.currentSessionId
          ? { ...session, isFirstMessage: false }
          : session
      )
    }));

    get().saveSessionsToStorage();
  },

  addUserMessage: (content, selectedElements) => {
    const state = get();
    if (!state.currentSessionId) return;

    const message: ChatMessage = {
      id: generateUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
      selectedElements
    };

    set((s) => ({
      sessions: s.sessions.map(session =>
        session.id === state.currentSessionId
          ? { ...session, messages: [...session.messages, message] }
          : session
      )
    }));

    get().saveSessionsToStorage();
  },

  addAssistantMessage: (content) => {
    const state = get();
    if (!state.currentSessionId) return;

    const message: ChatMessage = {
      id: generateUUID(),
      role: 'assistant',
      content,
      timestamp: Date.now()
    };

    set((s) => ({
      sessions: s.sessions.map(session =>
        session.id === state.currentSessionId
          ? { ...session, messages: [...session.messages, message] }
          : session
      )
    }));

    get().saveSessionsToStorage();
  },

  addToolMessage: (toolName, toolParams) => {
    const state = get();
    if (!state.currentSessionId) return;

    const message: ChatMessage = {
      id: generateUUID(),
      role: 'tool',
      content: '',
      timestamp: Date.now(),
      toolName,
      toolParams
    };

    set((s) => ({
      sessions: s.sessions.map(session =>
        session.id === state.currentSessionId
          ? { ...session, messages: [...session.messages, message] }
          : session
      )
    }));

    get().saveSessionsToStorage();
  },

  getCurrentMessages: () => {
    const state = get();
    if (!state.currentSessionId) return [];

    const currentSession = state.sessions.find(s => s.id === state.currentSessionId);
    return currentSession?.messages || [];
  },

  setCurrentIframeUrl: (url) =>
    set({ currentIframeUrl: url }),

  addToQueue: (command, selectedElements, iframeUrl) => {
    const queuedTask: QueuedTask = {
      id: generateUUID(),
      command,
      selectedElements: selectedElements.map(el => ({
        tag: el.tag,
        id: el.id,
        classes: el.classes,
        path: el.path,
        text: el.text,
        url: el.url,
        css: el.css
      })),
      iframeUrl,
      isExpanded: false,
      isEditing: false,
      timestamp: Date.now()
    };

    set((state) => ({
      taskQueue: [...state.taskQueue, queuedTask]
    }));
  },

  removeFromQueue: (id) =>
    set((state) => ({
      taskQueue: state.taskQueue.filter(task => task.id !== id)
    })),

  getNextQueueItem: () => {
    const state = get();
    return state.taskQueue.length > 0 ? state.taskQueue[0] : null;
  },

  toggleQueueItemExpanded: (id) =>
    set((state) => ({
      taskQueue: state.taskQueue.map(task =>
        task.id === id ? { ...task, isExpanded: !task.isExpanded } : task
      )
    })),

  startEditingQueueItem: (id) =>
    set((state) => ({
      taskQueue: state.taskQueue.map(task =>
        task.id === id ? { ...task, isEditing: true } : task
      )
    })),

  updateQueueItemCommand: (id, newCommand) =>
    set((state) => ({
      taskQueue: state.taskQueue.map(task =>
        task.id === id ? { ...task, command: newCommand, isEditing: false } : task
      )
    })),

  cancelEditingQueueItem: (id) =>
    set((state) => ({
      taskQueue: state.taskQueue.map(task =>
        task.id === id ? { ...task, isEditing: false } : task
      )
    })),

  isAnyQueueItemEditing: () => {
    const state = get();
    return state.taskQueue.some(task => task.isEditing);
  },

  setPlaceholder: (placeholder) =>
    set({ placeholder }),

  clearPlaceholder: () =>
    set({ placeholder: null }),
}));
