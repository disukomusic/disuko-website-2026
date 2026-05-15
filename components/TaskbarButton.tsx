import React, { ReactNode } from "react";
import { useWindowContext, playAudio } from "@/components/WindowSystem";

export interface TaskbarButtonProps {
    className?: string;
    children?: ReactNode;
    windowId: string;
    soloMode?: boolean;
    soundClick?: string;
    muteSounds?: boolean;
}

export const TaskbarButton = ({ className, children, windowId, soloMode = false, soundClick, muteSounds = false }: TaskbarButtonProps) => {
    const { toggleWindow, closeWindow, setTaskbarHover, windowStates, defaultSounds, globalMute } = useWindowContext();
    const isOpen = windowStates[windowId]?.isOpen || false;

    const handleClick = () => {
        playAudio(soundClick || defaultSounds.click, muteSounds || globalMute);

        if (soloMode && !isOpen) {
            Object.keys(windowStates).forEach((id) => {
                if (id !== windowId && windowStates[id]?.isOpen) closeWindow(id);
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