import React, { ReactNode } from "react";
import { useWindowContext } from "@/components/WindowSystem";

export interface TaskbarButtonProps {
    className?: string;
    children?: ReactNode;
    windowId: string;
    soloMode?: boolean;
}

export const TaskbarButton = ({ className, children, windowId, soloMode = false }: TaskbarButtonProps) => {
    // Destructure closeWindow as well
    const { toggleWindow, closeWindow, setTaskbarHover, windowStates } = useWindowContext();
    const isOpen = windowStates[windowId]?.isOpen || false;

    const handleClick = () => {
        if (soloMode && !isOpen) {
            // Forcefully close all other open windows
            Object.keys(windowStates).forEach((id) => {
                if (id !== windowId && windowStates[id]?.isOpen) {
                    closeWindow(id);
                }
            });
        }
        toggleWindow(windowId);
    };

    return (
        <div
            className={className}
            onClick={handleClick}
            onMouseEnter={() => setTaskbarHover(windowId, true)}
            onMouseLeave={() => setTaskbarHover(windowId, false)}
            data-taskbar-btn-id={windowId}
            data-window-open={isOpen}
            style={{ cursor: 'pointer' }}
        >
            {children}
        </div>
    );
};