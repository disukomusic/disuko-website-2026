import React, { ReactNode, useRef, useEffect, useState, createContext } from "react";
import { CurrentWindowContext, useWindowContext } from "@/components/WindowSystem";
import { useDesktopBounds } from "./Desktop";
import { motion, useMotionValue, useTransform, useVelocity, useSpring, useDragControls } from "framer-motion";

export interface WindowProps {
    className?: string;
    children?: ReactNode;
    windowId: string;
    defaultOpen?: boolean;
    initialX?: string | number;
    initialY?: string | number;
    initialPosition?: string;
}

export const WindowDragContext = createContext<any>(null);

export const Window = ({
                           className,
                           children,
                           windowId,
                           defaultOpen = false,
                           initialX = 0,
                           initialY = 0,
                           initialPosition
                       }: WindowProps) => {
    const { windowStates, windowOrder, focusWindow, registerWindow } = useWindowContext();
    const windowRef = useRef<HTMLDivElement>(null);
    const dragControls = useDragControls();

    const desktopBoundsRef = useDesktopBounds();
    const [origin, setOrigin] = useState({ x: "50%", y: "24px" });
    const [isRendered, setIsRendered] = useState(defaultOpen);

    const startStyles: React.CSSProperties = {
        left: initialX,
        top: initialY,
        right: undefined,
        bottom: undefined
    };

    if (initialPosition) {
        const cleanString = initialPosition.replace(/[:,]/g, ' ');
        const parts = cleanString.trim().split(/\s+/);
        const keywords = ['left', 'right', 'top', 'bottom'];
        const hasKeywords = parts.some(part => keywords.includes(part.toLowerCase()));

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

    React.useEffect(() => {
        registerWindow(windowId, defaultOpen);
    }, [windowId, registerWindow, defaultOpen]);

    const state = windowStates[windowId];

    // Immediately mount children when the window opens
    useEffect(() => {
        if (state?.isOpen) setIsRendered(true);
    }, [state?.isOpen]);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const xVelocity = useVelocity(x);
    const rotateRaw = useTransform(xVelocity, [-800, 800], [-8, 8]);
    const rotate = useSpring(rotateRaw, { stiffness: 150, damping: 15 });

    useEffect(() => {
        if (state && !state.isOpen && windowRef.current && desktopBoundsRef?.current) {
            const btn = document.querySelector(`[data-taskbar-btn-id="${windowId}"]`);

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

    const zIndex = windowOrder.indexOf(windowId) + 10;
    const isFocused = windowOrder[windowOrder.length - 1] === windowId;

    return (
        <CurrentWindowContext.Provider value={windowId}>
            <WindowDragContext.Provider value={dragControls}>
                <motion.div
                    ref={windowRef}
                    className={className}
                    drag={state.isOpen}
                    dragControls={dragControls}
                    dragListener={false}
                    dragMomentum={false}
                    dragConstraints={desktopBoundsRef || undefined}
                    dragElastic={0}
                    onPointerDown={() => focusWindow(windowId)}
                    initial={false}
                    animate={{
                        scale: state.isOpen ? 1 : 0,
                        opacity: state.isOpen ? 1 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.8 }}
                    onAnimationComplete={() => {
                        if (state.isOpen) {
                            setOrigin({ x: "50%", y: "24px" });
                            setTimeout(() => window.dispatchEvent(new Event('resize')), 10);
                        } else {
                            // Safely unmount children to clear WebGL contexts / heavy elements
                            setIsRendered(false);
                        }
                    }}
                    style={{
                        ...startStyles,
                        x,
                        y,
                        rotate,
                        transformOrigin: `${origin.x} ${origin.y}`,
                        pointerEvents: state.isOpen ? 'auto' : 'none',
                        flexDirection: 'column',
                        position: 'absolute',
                        zIndex,
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