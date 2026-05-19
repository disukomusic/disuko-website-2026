import React, { ReactNode, useMemo } from "react";
import { useWindowContext, playAudio } from "@/components/WindowSystem";

export interface TaskbarButtonProps {
    className?: string;
    children?: ReactNode;
    targetWindowIds: string;
    soloMode?: boolean;
    soundClick?: string;
    soundHover?: string;
    muteSounds?: boolean;
}

export const TaskbarButton = ({
                                  className,
                                  children,
                                  targetWindowIds = "",
                                  soloMode = false,
                                  soundClick,
                                  soundHover,
                                  muteSounds = false
                              }: TaskbarButtonProps) => {
    const { toggleWindow, closeWindow, setTaskbarHover, windowStates, defaultSounds, globalMute } = useWindowContext();

    // Dynamically resolve wildcards based on currently registered windows
    const ids = useMemo(() => {
        const rawPatterns = targetWindowIds.split(',').map(p => p.trim()).filter(Boolean);
        const registeredWindows = Object.keys(windowStates);
        const resolved: string[] = [];

        rawPatterns.forEach(pattern => {
            if (pattern.includes('*')) {
                // Convert the wildcard into a Regex (e.g., "home-*" becomes /^home-.*$/)
                const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
                const matches = registeredWindows.filter(id => regex.test(id));
                resolved.push(...matches);
            } else {
                // Not a wildcard, just push the exact ID
                resolved.push(pattern);
            }
        });

        // Remove any accidental duplicates and return
        return Array.from(new Set(resolved));
    }, [targetWindowIds, windowStates]);

    // The button is considered "open" if ANY of its resolved target windows are currently open
    const isOpen = ids.some(id => windowStates[id]?.isOpen);

    const handleClick = () => {
        playAudio(soundClick || defaultSounds.click, muteSounds || globalMute);

        if (soloMode && !isOpen) {
            Object.keys(windowStates).forEach((id) => {
                if (!ids.includes(id) && windowStates[id]?.isOpen) closeWindow(id);
            });
        }

        // Toggle all resolved windows
        ids.forEach(id => toggleWindow(id));
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
            // Join the dynamically found IDs so the minimization animation still knows where to go
            data-taskbar-btn-id={ids.join(" ")}
            data-window-open={isOpen}
            style={{ cursor: 'pointer' }}
        >
            {children}
        </div>
    );
};