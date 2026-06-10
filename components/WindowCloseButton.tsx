import React, {ReactNode} from "react";
import { useCurrentWindow, useWindowStore, playAudio } from "@/components/WindowSystem";
export interface WindowCloseButtonProps {
    className?: string;
    children?: ReactNode;
    soundClick?: string;
    muteSounds?: boolean;
    onCustomAction?: () => void; // NEW: Add custom action prop
}
export const WindowCloseButton = ({ className, children, soundClick, muteSounds = false, onCustomAction }: WindowCloseButtonProps) => {
    const windowId = useCurrentWindow();
    const { closeWindow, defaultSounds, globalMute } = useWindowStore();
    
    const handleClick = () => {
        playAudio(soundClick || defaultSounds.click, muteSounds || globalMute);
        closeWindow(windowId);

        // NEW: Fire the custom action if it exists
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