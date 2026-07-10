import React, { ReactNode, useMemo } from "react";
import { useWindowStore, playAudio } from "@/components/WindowSystem";

export interface TaskbarButtonProps {
    className?: string;
    children?: ReactNode;
    targetWindowIds: string;
    soloMode?: boolean;
    minimizeGroup?: string;
    routeUrl?: string;
    soundClick?: string;
    soundHover?: string;
    muteSounds?: boolean;
    onCustomAction?: () => void;
}

export const TaskbarButton = ({
                                  className, children, targetWindowIds = "", soloMode = false,
                                  minimizeGroup = "", routeUrl,
                                  soundClick, soundHover, muteSounds = false, onCustomAction
                              }: TaskbarButtonProps) => {

    const { toggleWindow, toggleMinimize, closeWindow, setTaskbarHover, windowStates, defaultSounds, globalMute } = useWindowStore();

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

        if (routeUrl) {
            const formattedUrl = routeUrl.startsWith('/') ? routeUrl : `/${routeUrl}`;
            if (window.location.pathname !== formattedUrl) {
                window.history.pushState({}, '', formattedUrl);
            }
        }

        if (needsRestore) {
            if (soloMode) {
                Object.keys(windowStates).forEach((id) => {
                    if (!ids.includes(id) && windowStates[id]?.isOpen) closeWindow(id);
                });
            }

            if (minimizeIds.length > 0) {
                minimizeIds.forEach((id) => {
                    const state = windowStates[id];
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