import React, { ReactNode, useMemo } from "react";
import { useWindowContext, playAudio } from "@/components/WindowSystem";

export interface TaskbarButtonProps {
    className?: string;
    children?: ReactNode;
    targetWindowIds: string;
    soloMode?: boolean;
    minimizeGroup?: string; // NEW: The group of windows to minimize
    soundClick?: string;
    soundHover?: string;
    muteSounds?: boolean;
    onCustomAction?: () => void;
}

export const TaskbarButton = ({
                                  className, children, targetWindowIds = "", soloMode = false,
                                  minimizeGroup = "", // NEW
                                  soundClick, soundHover, muteSounds = false, onCustomAction
                              }: TaskbarButtonProps) => {

    const { toggleWindow, toggleMinimize, closeWindow, setTaskbarHover, windowStates, defaultSounds, globalMute } = useWindowContext();

    // Resolve target IDs
    const ids = useMemo(() => {
        const rawPatterns = targetWindowIds.split(',').map(p => p.trim()).filter(Boolean);
        const registeredWindows = Object.keys(windowStates);
        const resolved: string[] = [];

        rawPatterns.forEach(pattern => {
            if (pattern.includes('*')) {
                const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
                const matches = registeredWindows.filter(id => regex.test(id));
                resolved.push(...matches);
            } else {
                resolved.push(pattern);
            }
        });
        return Array.from(new Set(resolved));
    }, [targetWindowIds, windowStates]);

    // Resolve Minimize Group IDs using the same wildcard logic
    const minimizeIds = useMemo(() => {
        if (!minimizeGroup) return [];
        const rawPatterns = minimizeGroup.split(',').map(p => p.trim()).filter(Boolean);
        const registeredWindows = Object.keys(windowStates);
        const resolved: string[] = [];

        rawPatterns.forEach(pattern => {
            if (pattern.includes('*')) {
                const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
                const matches = registeredWindows.filter(id => regex.test(id));
                resolved.push(...matches);
            } else {
                resolved.push(pattern);
            }
        });
        return Array.from(new Set(resolved));
    }, [minimizeGroup, windowStates]);

    const isOpen = ids.some(id => windowStates[id]?.isOpen);
    const needsRestore = ids.some(id => !windowStates[id]?.isOpen || windowStates[id]?.isMinimized);

    const handleClick = () => {
        playAudio(soundClick || defaultSounds.click, muteSounds || globalMute);

        if (needsRestore) {
            // Standard Solo mode: closes other windows entirely
            if (soloMode) {
                Object.keys(windowStates).forEach((id) => {
                    if (!ids.includes(id) && windowStates[id]?.isOpen) closeWindow(id);
                });
            }

            // Minimize Group logic: soft solo mode
            // Only trigger when we are opening/restoring the target windows
            if (minimizeIds.length > 0) {
                minimizeIds.forEach((id) => {
                    const state = windowStates[id];
                    // If it's open, not already minimized, and NOT part of the window we are currently opening
                    if (state && state.isOpen && !state.isMinimized && !ids.includes(id)) {
                        toggleMinimize(id);
                    }
                });
            }

            ids.forEach(id => {
                const state = windowStates[id];
                if (!state) return;

                if (!state.isOpen) {
                    toggleWindow(id);
                } else if (state.isMinimized) {
                    toggleMinimize(id);
                }
            });
        }

        if (onCustomAction) {
            onCustomAction();
        }
    };

    const handleMouseEnter = () => {
        ids.forEach(id => setTaskbarHover(id, true));
        playAudio(soundHover || defaultSounds.taskbarHover, muteSounds || globalMute);
    };

    const handleMouseLeave = () => {
        ids.forEach(id => setTaskbarHover(id, false));
    };

    return (
        <div
            className={className}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            data-taskbar-btn-id={ids.join(" ")}
            data-window-open={isOpen}
            style={{ cursor: 'pointer' }}
        >
            {children}
        </div>
    );
};