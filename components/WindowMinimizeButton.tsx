import React, {ReactNode} from "react";
import { useCurrentWindow, useWindowStore, playAudio } from "@/components/WindowSystem";
export interface WindowMinimizeButtonProps {
    className?: string;
    children?: ReactNode;
    soundClick?: string;
    muteSounds?: boolean;
    onCustomAction?: () => void;
}

export const WindowMinimizeButton = ({ className, children, soundClick, muteSounds = false, onCustomAction }: WindowMinimizeButtonProps) => {
    const windowId = useCurrentWindow();
    const { toggleMinimize, defaultSounds, globalMute } = useWindowStore();

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevents dragging when clicking the button
        playAudio(soundClick || defaultSounds.click, muteSounds || globalMute);
        toggleMinimize(windowId);

        if (onCustomAction) {
            onCustomAction();
        }
    };

    return (
        <div className={className} onClick={handleClick} style={{ cursor: 'pointer' }}>
            {children}
        </div>
    );
};