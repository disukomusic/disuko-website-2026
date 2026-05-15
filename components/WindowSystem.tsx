import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// --- Audio Utility ---
const audioDebounceMap = new Map<string, number>();

export const playAudio = (url?: string, muted?: boolean) => {
    if (!url || muted) return;

    const now = Date.now();
    const lastPlayed = audioDebounceMap.get(url) || 0;

    // Prevent the exact same sound from playing multiple times within 50ms.
    // This perfectly catches simultaneous useEffect fires across multiple components.
    if (now - lastPlayed < 50) return;

    audioDebounceMap.set(url, now);

    try {
        const audio = new Audio(url);
        // Catch is required because browsers block autoplaying audio before the user interacts with the page
        audio.play().catch(e => console.warn("Audio play blocked/failed:", e));
    } catch (e) {
        console.error("Invalid audio playback", e);
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
};

// --- GLOBAL CONTEXT ---
type WindowState = {
    isOpen: boolean;
    isTaskbarHovered: boolean;
};

type WindowContextType = {
    windowStates: Record<string, WindowState>;
    windowOrder: string[];
    toggleWindow: (id: string) => void;
    closeWindow: (id: string) => void;
    focusWindow: (id: string) => void;
    setTaskbarHover: (id: string, isHovered: boolean) => void;
    registerWindow: (id: string, defaultOpen?: boolean) => void;
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
    defaultSoundOpen?: string;
    defaultSoundClose?: string;
    defaultSoundFocus?: string;
    defaultSoundDragStart?: string;
    defaultSoundDragEnd?: string;
    defaultSoundClick?: string;
    defaultSoundTaskbarHover?: string;
}

export const WindowProvider = ({
                                   children,
                                   initialGlobalMute = false,
                                   defaultSoundOpen,
                                   defaultSoundClose,
                                   defaultSoundFocus,
                                   defaultSoundDragStart,
                                   defaultSoundDragEnd,
                                   defaultSoundClick,
                                   defaultSoundTaskbarHover
                               }: WindowProviderProps) => {

    const defaultSounds: DefaultSounds = {
        open: defaultSoundOpen,
        close: defaultSoundClose,
        focus: defaultSoundFocus,
        dragStart: defaultSoundDragStart,
        dragEnd: defaultSoundDragEnd,
        click: defaultSoundClick,
        taskbarHover: defaultSoundTaskbarHover,
    };
    const [windowStates, setWindowStates] = useState<Record<string, WindowState>>({});
    const [windowOrder, setWindowOrder] = useState<string[]>([]);
    const [globalMute, setGlobalMute] = useState(initialGlobalMute);

    const registerWindow = useCallback((id: string, defaultOpen = false) => {
        setWindowStates((prev) => {
            if (prev[id]) return prev;
            return { ...prev, [id]: { isOpen: defaultOpen, isTaskbarHovered: false } };
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
            if (!state.isOpen) focusWindow(id); // Focus when opening
            return { ...prev, [id]: { ...state, isOpen: !state.isOpen } };
        });
    }, [focusWindow]);

    const closeWindow = useCallback((id: string) => {
        setWindowStates((prev) => {
            const state = prev[id];
            if (!state) return prev;
            return { ...prev, [id]: { ...state, isOpen: false } };
        });
    }, []);

    const setTaskbarHover = useCallback((id: string, isHovered: boolean) => {
        setWindowStates((prev) => {
            const state = prev[id];
            if (!state) return prev;
            return { ...prev, [id]: { ...state, isTaskbarHovered: isHovered } };
        });
    }, []);

    return (
        <WindowContext.Provider value={{
            windowStates, windowOrder, toggleWindow, closeWindow, focusWindow, setTaskbarHover, registerWindow,
            defaultSounds, globalMute, setGlobalMute
        }}>
            {children}
        </WindowContext.Provider>
    );
};

// --- LOCAL CONTEXT (For Window Children) ---
export const CurrentWindowContext = createContext<string | null>(null);

export const useCurrentWindow = () => {
    const ctx = useContext(CurrentWindowContext);
    if (!ctx) throw new Error('Must be used within a Window component');
    return ctx;
};