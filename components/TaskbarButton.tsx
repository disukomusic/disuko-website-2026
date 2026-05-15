import React, { ReactNode } from "react";
import { useWindowContext, playAudio } from "@/components/WindowSystem";

export interface TaskbarButtonProps {
    className?: string;
    children?: ReactNode;
    windowId: string;
    soloMode?: boolean;
    soundClick?: string;
    soundHover?: string;
    muteSounds?: boolean;
}

export const TaskbarButton = ({
                                  className,
                                  children,
                                  windowId,
                                  soloMode = false,
                                  soundClick,
                                  soundHover,
                                  muteSounds = false
                              }: TaskbarButtonProps) => {
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

    const handleMouseEnter = () => {
        setTaskbarHover(windowId, true);
        playAudio(soundHover || defaultSounds.taskbarHover, muteSounds || globalMute);
    };

    const handleMouseLeave = () => {
        setTaskbarHover(windowId, false);
    };

    return (
        <div
            className={className}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            data-taskbar-btn-id={windowId}
            data-window-open={isOpen}
            style={{ cursor: 'pointer' }}
        >
            {children}
        </div>
    );
};