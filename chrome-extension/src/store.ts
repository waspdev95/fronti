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

export interface ElementTaskState {
  element: HTMLElement;
  state: 'loading' | 'success' | 'error';
  timestamp: number;
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

interface AppState {
  selectedElements: ElementInfo[];
  selectorMode: boolean;
  panelPosition: { x: number; y: number };
  isPanelAbove: boolean;
  elementTasks: ElementTaskState[];
  command: string;
  isStreaming: boolean;
  currentSessionId: string | null;
  sessions: ChatSession[];
  currentIframeUrl: string;

  addSelectedElement: (info: ElementInfo) => void;
  removeSelectedElement: (element: HTMLElement) => void;
  removeSelectedElementByIndex: (index: number) => void;
  clearSelectedElements: () => void;
  toggleSelectorMode: () => void;
  setPanelPosition: (position: { x: number; y: number }) => void;
  setPanelAbove: (above: boolean) => void;
  setElementTaskState: (element: HTMLElement, state: 'loading' | 'success' | 'error') => void;
  removeElementTask: (element: HTMLElement) => void;
  setCommand: (command: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  startNewSession: () => void;
  setCurrentSessionId: (id: string | null) => void;
  loadSessionsFromStorage: () => void;
  saveSessionsToStorage: () => void;
  getIsFirstMessage: () => boolean;
  setMessageSent: () => void;
  addUserMessage: (content: string, selectedElements?: Array<{tag: string; id: string; classes: string; path: string}>) => void;
  addAssistantMessage: (content: string) => void;
  addToolMessage: (toolName: string, toolParams: Record<string, any>) => void;
  getCurrentMessages: () => ChatMessage[];
  setCurrentIframeUrl: (url: string) => void;
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
  panelPosition: { x: 20, y: 20 },
  isPanelAbove: false,
  elementTasks: [],
  command: '',
  isStreaming: false,
  currentSessionId: null,
  sessions: [],
  currentIframeUrl: '',

  addSelectedElement: (info) =>
    set((state) => {
      const exists = state.selectedElements.some(e => e.element === info.element);
      if (exists) {
        return { selectedElements: state.selectedElements.filter(e => e.element !== info.element) };
      }
      return { selectedElements: [...state.selectedElements, info] };
    }),

  removeSelectedElement: (element) =>
    set((state) => ({
      selectedElements: state.selectedElements.filter(e => e.element !== element)
    })),

  removeSelectedElementByIndex: (index) =>
    set((state) => ({
      selectedElements: state.selectedElements.filter((_, i) => i !== index)
    })),

  clearSelectedElements: () =>
    set({ selectedElements: [], command: '' }),

  toggleSelectorMode: () =>
    set((state) => ({ selectorMode: !state.selectorMode })),

  setPanelPosition: (position) =>
    set({ panelPosition: position }),

  setPanelAbove: (above) =>
    set({ isPanelAbove: above }),

  setElementTaskState: (element, state) =>
    set((store) => {
      const existing = store.elementTasks.find(t => t.element === element);
      if (existing) {
        return {
          elementTasks: store.elementTasks.map(t =>
            t.element === element
              ? { ...t, state, timestamp: Date.now() }
              : t
          )
        };
      }
      return {
        elementTasks: [...store.elementTasks, { element, state, timestamp: Date.now() }]
      };
    }),

  removeElementTask: (element) =>
    set((store) => ({
      elementTasks: store.elementTasks.filter(t => t.element !== element)
    })),

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

  setCurrentSessionId: (id) =>
    set({ currentSessionId: id }),

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
}));
