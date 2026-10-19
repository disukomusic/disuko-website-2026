import React, {
    ReactNode,
    useRef,
    useEffect,
    useLayoutEffect,
    useState,
    createContext,
    useContext
} from "react";
import {
    CurrentWindowContext,
    WindowGroupContext,
    useWindowStore,
    playAudio
} from "@/components/WindowSystem";
import { useDesktopBounds, useMobileMode } from "./Desktop";
import {
    motion,
    useMotionValue,
    useTransform,
    useVelocity,
    useSpring,
    useDragControls
} from "framer-motion";

export interface WindowProps {
    className?: string;
    children?: ReactNode;
    windowId: string;
    defaultOpen?: boolean;
    initialX?: string | number;
    initialY?: string | number;
    initialPosition?: string;
    soundOpen?: string;
    soundClose?: string;
    soundFocus?: string;
    soundDragStart?: string;
    soundDragEnd?: string;
    soundMinimize?: string;
    soundMaximize?: string;
    muteSounds?: boolean;
    alwaysAtBack?: boolean;
    onOpen?: () => void;
    onClose?: () => void;
    onFocus?: () => void;
    onUnfocus?: () => void;
    onMinimize?: () => void;
    pageGroup?: string;
}

export const WindowDragContext = createContext<any>(null);

export const Window = ({
                           className,
                           children,
                           windowId,
                           defaultOpen = false,
                           initialX = 0,
                           initialY = 0,
                           initialPosition,
                           soundOpen,
                           soundClose,
                           soundFocus,
                           soundDragStart,
                           soundDragEnd,
                           soundMinimize,
                           soundMaximize,
                           muteSounds = false,
                           alwaysAtBack = false,
                           onOpen,
                           onClose,
                           onFocus,
                           onUnfocus,
                           onMinimize,
                           pageGroup = "",
                       }: WindowProps) => {
    // 1. Store actions & global settings
    const { focusWindow, registerWindow, toggleMinimize } = useWindowStore();
    const defaultSounds = useWindowStore((state) => state.defaultSounds);
    const globalMute = useWindowStore((state) => state.globalMute);
    const contextPageGroup = useContext(WindowGroupContext);
    const resolvedPageGroup = pageGroup || contextPageGroup || "";

    // 2. Window-specific state selectors
    const state = useWindowStore((s) => s.windowStates[windowId]);
    const isFocused = useWindowStore((s) => s.windowOrder[s.windowOrder.length - 1] === windowId);
    const windowOrderIndex = useWindowStore((s) => s.windowOrder.indexOf(windowId));

    // Calculate stack index when minimized
    const minimizedIndex = useWindowStore((s) => {
        let index = 0;
        for (const [id, st] of Object.entries(s.windowStates)) {
            if (id === windowId) return st.isOpen && st.isMinimized ? index : -1;
            if (st.isOpen && st.isMinimized) index++;
        }
        return -1;
    });

    const isMinimized = state?.isMinimized || false;

    // 3. Refs & local state
    const windowRef = useRef<HTMLDivElement>(null);
    const dragControls = useDragControls();
    const desktopBoundsRef = useDesktopBounds();
    const mobileMode = useMobileMode();

    const [origin, setOrigin] = useState({ x: "50%", y: "24px" });
    const [isRendered, setIsRendered] = useState(defaultOpen);

    const prevIsOpen = useRef(defaultOpen);
    const prevIsFocused = useRef(false);
    const prevIsMinimized = useRef(false);

    // 4. Parse initial position coordinates or keyword pairs (e.g., "left 20px top 40px")
    const startStyles: React.CSSProperties = {
        left: initialX,
        top: initialY,
        right: undefined,
        bottom: undefined
    };

    if (initialPosition) {
        const cleanString = initialPosition.replace(/[:,]/g, " ");
        const parts = cleanString.trim().split(/\s+/);
        const keywords = ["left", "right", "top", "bottom"];
        const hasKeywords = parts.some((part) => keywords.includes(part.toLowerCase()));

        if (hasKeywords) {
            startStyles.left = undefined;
            startStyles.top = undefined;
            for (let i = 0; i < parts.length; i++) {
                const word = parts[i].toLowerCase();
                if (keywords.includes(word) && parts[i + 1]) {
                    // @ts-ignore
                    startStyles[word] = parts[i + 1];
                    i++;
                }
            }
        } else {
            if (parts[0]) startStyles.left = parts[0];
            if (parts[1]) startStyles.top = parts[1];
        }
    }

    // 5. Register window in Zustand store on mount
    useEffect(() => {
        registerWindow(windowId, defaultOpen, resolvedPageGroup);
    }, [windowId, registerWindow, defaultOpen, resolvedPageGroup]);

    // Helper to calculate transformOrigin relative to the corresponding TaskbarButton
    const updateTaskbarOrigin = () => {
        if (!windowRef.current || !desktopBoundsRef?.current || mobileMode) return;
        const btn = document.querySelector(`[data-taskbar-btn-id~="${windowId}"]`);
        if (!btn) return;

        // Ensure element is measurable even if transitioning from display: none
        const prevDisplay = windowRef.current.style.display;
        if (prevDisplay === "none") {
            windowRef.current.style.display = "flex";
        }

        const btnRect = btn.getBoundingClientRect();
        const desktopRect = desktopBoundsRef.current.getBoundingClientRect();
        const currentX = typeof x.get() === "number" ? (x.get() as number) : 0;
        const currentY = typeof y.get() === "number" ? (y.get() as number) : 0;
        const btnCenterToDesktopX = btnRect.left + btnRect.width / 2 - desktopRect.left;
        const btnCenterToDesktopY = btnRect.top + btnRect.height / 2 - desktopRect.top;
        const winLeft = windowRef.current.offsetLeft;
        const winTop = windowRef.current.offsetTop;

        if (prevDisplay === "none") {
            windowRef.current.style.display = prevDisplay;
        }

        setOrigin({
            x: `${btnCenterToDesktopX - winLeft - currentX}px`,
            y: `${btnCenterToDesktopY - winTop - currentY}px`
        });
    };

    // 6. Handle Open / Close lifecycle, sounds, and origin calculation
    useLayoutEffect(() => {
        if (!state) return;

        if (state.isOpen !== prevIsOpen.current) {
            const isMuted = muteSounds || globalMute;

            if (state.isOpen) {
                setIsRendered(true);
                updateTaskbarOrigin();
                playAudio(soundOpen || defaultSounds.open, isMuted);
                if (onOpen) onOpen();
            } else {
                updateTaskbarOrigin();
                playAudio(soundClose || defaultSounds.close, isMuted);
                if (onClose) onClose();
            }
            prevIsOpen.current = state.isOpen;
        }

        // Safety fallback: ensure interior children unmount 400ms after closing
        // even if Framer Motion's onAnimationComplete is interrupted
        if (!state.isOpen && isRendered) {
            const timer = setTimeout(() => setIsRendered(false), 400);
            return () => clearTimeout(timer);
        }
    }, [
        state?.isOpen,
        isRendered,
        windowId,
        mobileMode,
        desktopBoundsRef,
        soundOpen,
        soundClose,
        defaultSounds,
        muteSounds,
        globalMute,
        onOpen,
        onClose
    ]);

    // 7. Track Focus / Unfocus callbacks
    useEffect(() => {
        if (isFocused !== prevIsFocused.current) {
            if (isFocused) {
                if (onFocus) onFocus();
            } else {
                if (onUnfocus) onUnfocus();
            }
            prevIsFocused.current = isFocused;
        }
    }, [isFocused, onFocus, onUnfocus]);

    // 8. Track Minimize / Restore sounds and callbacks
    useEffect(() => {
        if (!state) return;
        if (state.isMinimized !== prevIsMinimized.current) {
            const isMuted = muteSounds || globalMute;
            if (state.isMinimized) {
                playAudio(soundMinimize || defaultSounds.minimize, isMuted);
                if (onMinimize) onMinimize();
            } else if (state.isOpen) {
                playAudio(soundMaximize || defaultSounds.maximize, isMuted);
            }
            prevIsMinimized.current = state.isMinimized;
        }
    }, [
        state?.isMinimized,
        state?.isOpen,
        soundMinimize,
        soundMaximize,
        defaultSounds,
        muteSounds,
        globalMute,
        onMinimize
    ]);

    // 9. Drag physics & velocity tilt
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const xVelocity = useVelocity(x);
    const rotateRaw = useTransform(xVelocity, [-800, 800], [-8, 8]);
    const rotate = useSpring(rotateRaw, { stiffness: 150, damping: 15 });

    const savedPos = useRef({ x: 0, y: 0 });
    const wasMinimized = useRef(false);

    // Save and restore drag coordinates when minimizing/unminimizing
    useLayoutEffect(() => {
        if (isMinimized) {
            if (!wasMinimized.current) {
                savedPos.current = { x: x.get(), y: y.get() };
                wasMinimized.current = true;
            }
            x.set(0);
            y.set(0);
        } else {
            if (wasMinimized.current) {
                x.set(savedPos.current.x);
                y.set(savedPos.current.y);
                wasMinimized.current = false;
            }
        }
    }, [isMinimized, x, y]);

    const handlePointerDown = () => {
        // Ensure pivot is locked to the top bar before any drag begins
        if (origin.x !== "50%" || origin.y !== "24px") {
            setOrigin({ x: "50%", y: "24px" });
        }
        if (!isFocused) {
            playAudio(soundFocus || defaultSounds.focus, muteSounds || globalMute);
        }
        focusWindow(windowId);
    };

    if (!state) return null;

    const calculatedZIndex = alwaysAtBack ? 1 : Math.max(10, windowOrderIndex + 10);

    return (
        <CurrentWindowContext.Provider value={windowId}>
            <WindowDragContext.Provider value={dragControls}>
                <motion.div
                    ref={windowRef}
                    className={className}
                    // Prevent native browser HTML5 drag from interfering with Framer Motion
                    draggable={false}
                    onDragStartCapture={(e) => e.preventDefault()}
                    // Framer Motion drag configuration (note: layout prop removed to prevent scale distortion)
                    drag={state.isOpen && !isMinimized && !mobileMode}
                    dragControls={dragControls}
                    dragListener={false}
                    dragMomentum={false}
                    dragConstraints={desktopBoundsRef || undefined}
                    dragElastic={0}
                    onPointerDownCapture={handlePointerDown}
                    onClick={() => {
                        if (isMinimized) toggleMinimize(windowId);
                    }}
                    onDragStart={() =>
                        playAudio(soundDragStart || defaultSounds.dragStart, muteSounds || globalMute)
                    }
                    onDragEnd={() =>
                        playAudio(soundDragEnd || defaultSounds.dragEnd, muteSounds || globalMute)
                    }
                    initial={false}
                    animate={{
                        scale: state.isOpen ? 1 : 0,
                        opacity: state.isOpen ? 1 : 0
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.8 }}
                    onAnimationComplete={() => {
                        if (state.isOpen) {
                            // Reset transform origin to the top title bar once open animation finishes
                            if (origin.x !== "50%" || origin.y !== "24px") {
                                setOrigin({ x: "50%", y: "24px" });
                                setTimeout(() => window.dispatchEvent(new Event("resize")), 10);
                            }
                        } else {
                            setIsRendered(false);
                        }
                    }}
                    style={{
                        x: mobileMode ? 0 : x,
                        y: mobileMode ? 0 : y,
                        rotate: mobileMode ? 0 : rotate,
                        transformOrigin: `${origin.x} ${origin.y}`,
                        pointerEvents: state.isOpen ? "auto" : "none",

                        // @ts-ignore - WebKit vendor prefix to prevent ghost dragging
                        WebkitUserDrag: "none",

                        display: state.isOpen || isRendered ? "flex" : "none",
                        flexDirection: "column",
                        position: mobileMode ? "relative" : "absolute",
                        zIndex: calculatedZIndex,
                        overflow: isMinimized ? "hidden" : "visible",
                        cursor: isMinimized ? "pointer" : "default",
                        flexShrink: mobileMode ? 0 : undefined,

                        ...(isMinimized
                            ? {
                                width: mobileMode ? "100%" : 256,
                                height: 82,
                                padding: 16,
                                left: mobileMode ? "auto" : "calc(100% - 276px)",
                                top: mobileMode ? "auto" : 10 + Math.max(0, minimizedIndex) * 74,
                                right: "auto",
                                bottom: "auto"
                            }
                            : {
                                width: mobileMode ? "100%" : undefined,
                                height: undefined,
                                ...(mobileMode
                                    ? { left: "auto", top: "auto", right: "auto", bottom: "auto" }
                                    : startStyles)
                            })
                    }}
                    data-focused={isFocused}
                    data-taskbar-hovered={state.isTaskbarHovered}
                >
                    {isRendered ? children : null}
                </motion.div>
            </WindowDragContext.Provider>
        </CurrentWindowContext.Provider>
    );
};