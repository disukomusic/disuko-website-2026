import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// --- GLOBAL CONTEXT ---
type WindowState = {
    isOpen: boolean;
    isTaskbarHovered: boolean;
};

type WindowContextType = {
    windowStates: Record<string, WindowState>;
    windowOrder: string[]; // Tracks z-index. Last item is on top.
    toggleWindow: (id: string) => void;
    closeWindow: (id: string) => void;
    focusWindow: (id: string) => void;
    setTaskbarHover: (id: string, isHovered: boolean) => void;
    registerWindow: (id: string, defaultOpen?: boolean) => void;
};

const WindowContext = createContext<WindowContextType | null>(null);

export const useWindowContext = () => {
    const ctx = useContext(WindowContext);
    if (!ctx) throw new Error('Must be used within a WindowProvider');
    return ctx;
};

export const WindowProvider = ({ children }: { children: ReactNode }) => {
    const [windowStates, setWindowStates] = useState<Record<string, WindowState>>({});
    const [windowOrder, setWindowOrder] = useState<string[]>([]);

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
        <WindowContext.Provider value={{ windowStates, windowOrder, toggleWindow, closeWindow, focusWindow, setTaskbarHover, registerWindow }}>
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