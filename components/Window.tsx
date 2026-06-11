import React, { ReactNode, useRef, useEffect, useLayoutEffect, useState, createContext } from "react";
import { CurrentWindowContext, useWindowStore, playAudio } from "@/components/WindowSystem";
import { useDesktopBounds } from "./Desktop";
import { motion, useMotionValue, useTransform, useVelocity, useSpring, useDragControls, animate as framerAnimate } from "framer-motion";

export interface WindowProps {
    className?: string; children?: ReactNode; windowId: string; defaultOpen?: boolean;
    initialX?: string | number; initialY?: string | number; initialPosition?: string;
    soundOpen?: string; soundClose?: string; soundFocus?: string; soundDragStart?: string;
    soundDragEnd?: string; soundMinimize?: string; soundMaximize?: string; muteSounds?: boolean; alwaysAtBack?: boolean;
    onOpen?: () => void;
    onClose?: () => void;
    onFocus?: () => void;
    onUnfocus?: () => void;
    onMinimize?: () => void;
    pageGroup?: string;
}

export const WindowDragContext = createContext<any>(null);

export const Window = ({
                           className, children, windowId, defaultOpen = false, initialX = 0, initialY = 0, initialPosition,
                           soundOpen, soundClose, soundFocus, soundDragStart, soundDragEnd, soundMinimize, soundMaximize, muteSounds = false, alwaysAtBack = false,
                           onOpen, onClose, onFocus, onUnfocus, onMinimize, pageGroup = "",
                       }: WindowProps) => {

    // 1. Grab ACTIONS from the store
    const { focusWindow, registerWindow, toggleMinimize } = useWindowStore();
    const defaultSounds = useWindowStore(state => state.defaultSounds);
    const globalMute = useWindowStore(state => state.globalMute);

    // 2. Grab SPECIFIC STATE
    const state = useWindowStore(s => s.windowStates[windowId]);
    const isFocused = useWindowStore(s => s.windowOrder[s.windowOrder.length - 1] === windowId);
    const windowOrderIndex = useWindowStore(s => s.windowOrder.indexOf(windowId));

    // Calculate minimized index for the stack position
    const minimizedIndex = useWindowStore(s => {
        const minimized = Object.entries(s.windowStates).filter(([_, st]) => st.isOpen && st.isMinimized).map(([id]) => id);
        return minimized.indexOf(windowId);
    });

    const isMinimized = state?.isMinimized || false;

    const windowRef = useRef<HTMLDivElement>(null);
    const dragControls = useDragControls();
    const desktopBoundsRef = useDesktopBounds();

    const [origin, setOrigin] = useState({ x: "50%", y: "24px" });
    const [isRendered, setIsRendered] = useState(defaultOpen);

    const startStyles: React.CSSProperties = { left: initialX, top: initialY, right: undefined, bottom: undefined };

    if (initialPosition) {
        const cleanString = initialPosition.replace(/[:,]/g, ' ');
        const parts = cleanString.trim().split(/\s+/);
        const keywords = ['left', 'right', 'top', 'bottom'];
        const hasKeywords = parts.some(part => keywords.includes(part.toLowerCase()));

        if (hasKeywords) {
            startStyles.left = undefined; startStyles.top = undefined;
            for (let i = 0; i < parts.length; i++) {
                const word = parts[i].toLowerCase();
                if (keywords.includes(word) && parts[i + 1]) {
                    // @ts-ignore
                    startStyles[word] = parts[i + 1]; i++;
                }
            }
        } else {
            if (parts[0]) startStyles.left = parts[0];
            if (parts[1]) startStyles.top = parts[1];
        }
    }

    const prevIsOpen = useRef(defaultOpen);
    const prevIsFocused = useRef(false);
    const prevIsMinimized = useRef(false);

    React.useEffect(() => {
        registerWindow(windowId, defaultOpen, pageGroup);
    }, [windowId, registerWindow, defaultOpen, pageGroup]);

    // Track Open / Close Events
    useEffect(() => {
        if (!state) return;
        if (state.isOpen !== prevIsOpen.current) {
            const isMuted = muteSounds || globalMute;
            if (state.isOpen) {
                setIsRendered(true);
                playAudio(soundOpen || defaultSounds.open, isMuted);
                if (onOpen) onOpen();
            } else {
                playAudio(soundClose || defaultSounds.close, isMuted);
                if (onClose) onClose();
            }
            prevIsOpen.current = state.isOpen;
        }
    }, [state?.isOpen, soundOpen, soundClose, defaultSounds, muteSounds, globalMute, onOpen, onClose]);

    // Track Focus / Unfocus Events
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

    // Track Minimize Events
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
    }, [state?.isMinimized, state?.isOpen, soundMinimize, soundMaximize, defaultSounds, muteSounds, globalMute, onMinimize]);

    const handlePointerDown = () => {
        if (!isFocused) playAudio(soundFocus || defaultSounds.focus, muteSounds || globalMute);
        focusWindow(windowId);
    };

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const xVelocity = useVelocity(x);
    const rotateRaw = useTransform(xVelocity, [-800, 800], [-8, 8]);
    const rotate = useSpring(rotateRaw, { stiffness: 150, damping: 15 });

    const savedPos = useRef({ x: 0, y: 0 });
    const wasMinimized = useRef(false);

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

    useEffect(() => {
        if (state && !state.isOpen && windowRef.current && desktopBoundsRef?.current) {
            const btn = document.querySelector(`[data-taskbar-btn-id~="${windowId}"]`);
            if (btn) {
                const btnRect = btn.getBoundingClientRect();
                const desktopRect = desktopBoundsRef.current.getBoundingClientRect();
                const currentX = typeof x.get() === 'number' ? x.get() as number : 0;
                const currentY = typeof y.get() === 'number' ? y.get() as number : 0;
                const btnCenterToDesktopX = (btnRect.left + btnRect.width / 2) - desktopRect.left;
                const btnCenterToDesktopY = (btnRect.top + btnRect.height / 2) - desktopRect.top;
                const winLeft = windowRef.current.offsetLeft;
                const winTop = windowRef.current.offsetTop;
                setOrigin({
                    x: `${(btnCenterToDesktopX - winLeft) - currentX}px`,
                    y: `${(btnCenterToDesktopY - winTop) - currentY}px`
                });
            }
        }
    }, [state?.isOpen, windowId, x, y, desktopBoundsRef]);

    if (!state) return null;

    const calculatedZIndex = alwaysAtBack ? 1 : Math.max(10, windowOrderIndex + 10);

    return (
        <CurrentWindowContext.Provider value={windowId}>
            <WindowDragContext.Provider value={dragControls}>
                <motion.div
                    ref={windowRef}
                    className={className}
                    layout
                    drag={state.isOpen && !isMinimized}
                    dragControls={dragControls}
                    dragListener={false}
                    dragMomentum={false}
                    dragConstraints={desktopBoundsRef || undefined}
                    dragElastic={0}
                    onPointerDownCapture={handlePointerDown}
                    onClick={() => { if (isMinimized) toggleMinimize(windowId); }}
                    onDragStart={() => playAudio(soundDragStart || defaultSounds.dragStart, muteSounds || globalMute)}
                    onDragEnd={() => playAudio(soundDragEnd || defaultSounds.dragEnd, muteSounds || globalMute)}
                    initial={false}
                    animate={{
                        scale: state.isOpen ? 1 : 0,
                        opacity: state.isOpen ? 1 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.8 }}
                    onAnimationComplete={() => {
                        if (state.isOpen) {
                            // Fix: Check if origin is already set to prevent infinite looping
                            if (origin.x !== "50%" || origin.y !== "24px") {
                                setOrigin({ x: "50%", y: "24px" });
                                setTimeout(() => window.dispatchEvent(new Event('resize')), 10);
                            }
                        } else {
                            setIsRendered(false);
                        }
                    }}
                    
                    style={{
                        x, y, rotate,
                        transformOrigin: `${origin.x} ${origin.y}`,
                        pointerEvents: state.isOpen ? 'auto' : 'none',
                        flexDirection: 'column',
                        position: 'absolute',
                        zIndex: calculatedZIndex,
                        overflow: isMinimized ? 'hidden' : 'visible',
                        cursor: isMinimized ? 'pointer' : 'default',
                        ...(isMinimized ? {
                            width: 256,
                            height: 82,
                            padding: 16,
                            left: "calc(100% - 276px)",
                            top: 10 + Math.max(0, minimizedIndex) * 74,
                            right: "auto",
                            bottom: "auto"
                        } : {
                            width: undefined,
                            height: undefined,
                            ...startStyles
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