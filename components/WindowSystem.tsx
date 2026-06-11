import { createContext, useContext } from 'react';
import { create } from 'zustand';

// --- Audio Utility ---
const audioDebounceMap = new Map<string, number>();

export const playAudio = (url?: string, muted?: boolean) => {
  if (!url || muted) return;
  const now = Date.now();
  const lastPlayed = audioDebounceMap.get(url) || 0;
  if (now - lastPlayed < 50) return;
  audioDebounceMap.set(url, now);
  try {
    const audio = new Audio(url);
    audio.play().catch((e) => console.warn('Audio play blocked/failed:', e));
  } catch (e) {
    console.error('Invalid audio playback', e);
  }
};

export type DefaultSounds = {
  open?: string;
  close?: string;
  focus?: string;
  dragStart?: string;
  dragEnd?: string;
  click?: string;
  taskbarHover?: string;
  minimize?: string;
  maximize?: string;
};

type WindowState = {
  isOpen: boolean;
  isTaskbarHovered: boolean;
  isMinimized: boolean;
  pageGroup?: string;
};

// --- ZUSTAND STORE ---
interface WindowStore {
  windowStates: Record<string, WindowState>;
  windowOrder: string[];
  globalMute: boolean;
  defaultSounds: DefaultSounds;

  // Actions
  setGlobalMute: (mute: boolean) => void;
  setDefaultSounds: (sounds: DefaultSounds) => void;
  registerWindow: (id: string, defaultOpen?: boolean, pageGroup?: string) => void;
  focusWindow: (id: string) => void;
  toggleWindow: (id: string) => void;
  toggleMinimize: (id: string) => void;
  closeWindow: (id: string) => void;
  setTaskbarHover: (id: string, isHovered: boolean) => void;

  minimizeWindowsByPattern: (patterns: string) => void;
  closeWindowsByPattern: (patterns: string) => void;
  openWindowsByPattern: (patterns: string) => void;
  openWindowsByGroup: (group: string) => void;
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  windowStates: {},
  windowOrder: [],
  globalMute: false,
  defaultSounds: {},

  setGlobalMute: (mute) => set({ globalMute: mute }),
  setDefaultSounds: (sounds) => set({ defaultSounds: sounds }),

    registerWindow: (id, defaultOpen = false, pageGroup = "") =>
        set((state) => {
            if (state.windowStates[id]) return state;
            return {
                windowStates: {
                    ...state.windowStates,
                    [id]: { isOpen: defaultOpen, isTaskbarHovered: false, isMinimized: false, pageGroup },
                },
                windowOrder: state.windowOrder.includes(id) ? state.windowOrder : [...state.windowOrder, id],
            };
        }),

    openWindowsByGroup: (group) =>
        set((state) => {
            if (!group) return state;
            const targetGroup = group.toLowerCase();
            let hasChanges = false;
            const nextState = { ...state.windowStates };

            Object.entries(nextState).forEach(([id, winState]) => {
                const isTargetGroup = winState.pageGroup?.toLowerCase() === targetGroup;

                if (isTargetGroup) {
                    // 1. If it belongs to the group and is closed, open it
                    if (!winState.isOpen) {
                        nextState[id] = { ...winState, isOpen: true, isMinimized: false };
                        hasChanges = true;
                    }
                } else {
                    // 2. If it DOES NOT belong to the group and is open, close it
                    if (winState.isOpen) {
                        nextState[id] = { ...winState, isOpen: false, isMinimized: false };
                        hasChanges = true;
                    }
                }
            });

            return hasChanges ? { windowStates: nextState } : state;
        }),

  focusWindow: (id) =>
    set((state) => {
      const filtered = state.windowOrder.filter((wId) => wId !== id);
      return { windowOrder: [...filtered, id] };
    }),

  toggleWindow: (id) =>
    set((state) => {
      const winState = state.windowStates[id];
      if (!winState) return state;
      // If we are opening it, focus it
      if (!winState.isOpen) {
        // use get() to call focusWindow (safe to call synchronously)
        get().focusWindow(id);
      }
      return {
        windowStates: { ...state.windowStates, [id]: { ...winState, isOpen: !winState.isOpen, isMinimized: false } },
      };
    }),

  toggleMinimize: (id) => {
    const state = get().windowStates[id];
    if (!state) return;
    if (!state.isMinimized) {
      // focusing if un-minimizing
      get().focusWindow(id);
    }
    set((store) => ({ windowStates: { ...store.windowStates, [id]: { ...state, isMinimized: !state.isMinimized } } }));
  },

  closeWindow: (id) =>
    set((state) => {
      const winState = state.windowStates[id];
      if (!winState) return state;
      return { windowStates: { ...state.windowStates, [id]: { ...winState, isOpen: false, isMinimized: false } } };
    }),

  setTaskbarHover: (id, isHovered) =>
    set((state) => {
      const winState = state.windowStates[id];
      if (!winState) return state;
      return { windowStates: { ...state.windowStates, [id]: { ...winState, isTaskbarHovered: isHovered } } };
    }),

  minimizeWindowsByPattern: (patterns) =>
    set((state) => {
      if (!patterns) return state;
      const rawPatterns = patterns.split(',').map((p) => p.trim()).filter(Boolean);
      const registeredWindows = Object.keys(state.windowStates);
      const resolved: string[] = [];

      rawPatterns.forEach((pattern) => {
        if (pattern.includes('*')) {
          const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
          resolved.push(...registeredWindows.filter((id) => regex.test(id)));
        } else if (registeredWindows.includes(pattern)) {
          resolved.push(pattern);
        }
      });

      let hasChanges = false;
      const nextState = { ...state.windowStates };

      Array.from(new Set(resolved)).forEach((id) => {
        const winState = nextState[id];
        if (winState && winState.isOpen && !winState.isMinimized) {
          nextState[id] = { ...winState, isMinimized: true };
          hasChanges = true;
        }
      });

      return hasChanges ? { windowStates: nextState } : state;
    }),

  openWindowsByPattern: (patterns) =>
    set((state) => {
      if (!patterns) return state;
      const rawPatterns = patterns.split(',').map((p) => p.trim()).filter(Boolean);
      const registeredWindows = Object.keys(state.windowStates);
      const resolved: string[] = [];

      rawPatterns.forEach((pattern) => {
        if (pattern.includes('*')) {
          const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
          resolved.push(...registeredWindows.filter((id) => regex.test(id)));
        } else if (registeredWindows.includes(pattern)) {
          resolved.push(pattern);
        }
      });

      let hasChanges = false;
      const nextState = { ...state.windowStates };

      Array.from(new Set(resolved)).forEach((id) => {
        const winState = nextState[id];
        if (winState && !winState.isOpen) {
          nextState[id] = { ...winState, isOpen: true, isMinimized: false };
          hasChanges = true;
        }
      });

      return hasChanges ? { windowStates: nextState } : state;
    }),

  closeWindowsByPattern: (patterns) =>
    set((state) => {
      if (!patterns) return state;
      const rawPatterns = patterns.split(',').map((p) => p.trim()).filter(Boolean);
      const registeredWindows = Object.keys(state.windowStates);
      const resolved: string[] = [];

      rawPatterns.forEach((pattern) => {
        if (pattern.includes('*')) {
          const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
          resolved.push(...registeredWindows.filter((id) => regex.test(id)));
        } else if (registeredWindows.includes(pattern)) {
          resolved.push(pattern);
        }
      });

      let hasChanges = false;
      const nextState = { ...state.windowStates };

      Array.from(new Set(resolved)).forEach((id) => {
        const winState = nextState[id];
        if (winState && winState.isOpen) {
          nextState[id] = { ...winState, isOpen: false, isMinimized: false };
          hasChanges = true;
        }
      });

      return hasChanges ? { windowStates: nextState } : state;
    }),
}));

// --- LOCAL CONTEXT (Required for Plasmic Children to know their Window ID) ---
export const CurrentWindowContext = createContext<string | null>(null);

export const useCurrentWindow = () => {
  const ctx = useContext(CurrentWindowContext);
  if (!ctx) throw new Error('Must be used within a Window component');
  return ctx;
};

export const WindowGroupContext = createContext<string | null>(null);

export const useWindowGroup = () => {
    return useContext(WindowGroupContext);
};
