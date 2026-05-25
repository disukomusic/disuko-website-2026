import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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
        audio.play().catch(e => console.warn("Audio play blocked/failed:", e));
    } catch (e) {
        console.error("Invalid audio playback", e);
    }
};

export type DefaultSounds = {
    open?: string; close?: string; focus?: string; dragStart?: string;
    dragEnd?: string; click?: string; taskbarHover?: string;
};

// --- GLOBAL CONTEXT ---
type WindowState = {
    isOpen: boolean;
    isTaskbarHovered: boolean;
    isMinimized: boolean;
};

type WindowContextType = {
    windowStates: Record<string, WindowState>;
    windowOrder: string[];
    toggleWindow: (id: string) => void;
    toggleMinimize: (id: string) => void;
    closeWindow: (id: string) => void;
    focusWindow: (id: string) => void;
    setTaskbarHover: (id: string, isHovered: boolean) => void;
    registerWindow: (id: string, defaultOpen?: boolean) => void;

    // NEW: Global wildcard minimizer
    minimizeWindowsByPattern: (patterns: string) => void;
    closeWindowsByPattern: (patterns: string) => void;

    defaultSounds: DefaultSounds;
    globalMute: boolean;
    setGlobalMute: (mute: boolean) => void;
};

const WindowContext = createContext<WindowContextType | null>(null);

export const useWindowContext = () => {
    const ctx = useContext(WindowContext);
    if (!ctx) throw new Error('Must be used within a WindowProvider');
    return ctx;
};

interface WindowProviderProps {
    children: ReactNode;
    initialGlobalMute?: boolean;
    defaultSoundOpen?: string; defaultSoundClose?: string; defaultSoundFocus?: string;
    defaultSoundDragStart?: string; defaultSoundDragEnd?: string;
    defaultSoundClick?: string; defaultSoundTaskbarHover?: string;
}

export const WindowProvider = ({
                                   children, initialGlobalMute = false, defaultSoundOpen, defaultSoundClose,
                                   defaultSoundFocus, defaultSoundDragStart, defaultSoundDragEnd, defaultSoundClick, defaultSoundTaskbarHover
                               }: WindowProviderProps) => {

    const defaultSounds: DefaultSounds = {
        open: defaultSoundOpen, close: defaultSoundClose, focus: defaultSoundFocus,
        dragStart: defaultSoundDragStart, dragEnd: defaultSoundDragEnd,
        click: defaultSoundClick, taskbarHover: defaultSoundTaskbarHover,
    };
    const [windowStates, setWindowStates] = useState<Record<string, WindowState>>({});
    const [windowOrder, setWindowOrder] = useState<string[]>([]);
    const [globalMute, setGlobalMute] = useState(initialGlobalMute);

    const registerWindow = useCallback((id: string, defaultOpen = false) => {
        setWindowStates((prev) => {
            if (prev[id]) return prev;
            return { ...prev, [id]: { isOpen: defaultOpen, isTaskbarHovered: false, isMinimized: false } };
        });
        setWindowOrder((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }, []);

    const focusWindow = useCallback((id: string) => {
        setWindowOrder((prev) => {
            const filtered = prev.filter((wId) => wId !== id);
            return [...filtered, id];
        });
    }, []);

    const toggleWindow = useCallback((id: string) => {
        setWindowStates((prev) => {
            const state = prev[id];
            if (!state) return prev;
            if (!state.isOpen) focusWindow(id);
            return { ...prev, [id]: { ...state, isOpen: !state.isOpen, isMinimized: false } };
        });
    }, [focusWindow]);

    const toggleMinimize = useCallback((id: string) => {
        setWindowStates((prev) => {
            const state = prev[id];
            if (!state) return prev;
            if (!state.isMinimized) focusWindow(id);
            return { ...prev, [id]: { ...state, isMinimized: !state.isMinimized } };
        });
    }, [focusWindow]);

    const closeWindow = useCallback((id: string) => {
        setWindowStates((prev) => {
            const state = prev[id];
            if (!state) return prev;
            return { ...prev, [id]: { ...state, isOpen: false, isMinimized: false } };
        });
    }, []);

    const setTaskbarHover = useCallback((id: string, isHovered: boolean) => {
        setWindowStates((prev) => {
            const state = prev[id];
            if (!state) return prev;
            return { ...prev, [id]: { ...state, isTaskbarHovered: isHovered } };
        });
    }, []);

    // NEW: Function to minimize windows globally using wildcards
    const minimizeWindowsByPattern = useCallback((patterns: string) => {
        if (!patterns) return;

        setWindowStates((prev) => {
            const rawPatterns = patterns.split(',').map(p => p.trim()).filter(Boolean);
            const registeredWindows = Object.keys(prev);
            const resolved: string[] = [];

            rawPatterns.forEach(pattern => {
                if (pattern.includes('*')) {
                    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
                    const matches = registeredWindows.filter(id => regex.test(id));
                    resolved.push(...matches);
                } else {
                    if (registeredWindows.includes(pattern)) {
                        resolved.push(pattern);
                    }
                }
            });

            let hasChanges = false;
            const nextState = { ...prev };

            // Apply minimize state only if the window is open and not already minimized
            Array.from(new Set(resolved)).forEach(id => {
                const state = nextState[id];
                if (state && state.isOpen && !state.isMinimized) {
                    nextState[id] = { ...state, isMinimized: true };
                    hasChanges = true;
                }
            });

            return hasChanges ? nextState : prev;
        });
    }, []);
    const closeWindowsByPattern = useCallback((patterns: string) => {
        if (!patterns) return;

        setWindowStates((prev) => {
            const rawPatterns = patterns.split(',').map(p => p.trim()).filter(Boolean);
            const registeredWindows = Object.keys(prev);
            const resolved: string[] = [];

            rawPatterns.forEach(pattern => {
                if (pattern.includes('*')) {
                    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
                    const matches = registeredWindows.filter(id => regex.test(id));
                    resolved.push(...matches);
                } else {
                    if (registeredWindows.includes(pattern)) {
                        resolved.push(pattern);
                    }
                }
            });

            let hasChanges = false;
            const nextState = { ...prev };

            // Apply close state only if the window is open
            Array.from(new Set(resolved)).forEach(id => {
                const state = nextState[id];
                if (state && state.isOpen) {
                    nextState[id] = { ...state, isOpen: false, isMinimized: false };
                    hasChanges = true;
                }
            });

            return hasChanges ? nextState : prev;
        });
    }, []);

    return (
        <WindowContext.Provider value={{
            windowStates, windowOrder, toggleWindow, toggleMinimize, closeWindow, focusWindow,
            setTaskbarHover, registerWindow, minimizeWindowsByPattern, closeWindowsByPattern,
            defaultSounds, globalMute, setGlobalMute
        }}>
            {children}
        </WindowContext.Provider>
    );
};

export const CurrentWindowContext = createContext<string | null>(null);

export const useCurrentWindow = () => {
    const ctx = useContext(CurrentWindowContext);
    if (!ctx) throw new Error('Must be used within a Window component');
    return ctx;
};