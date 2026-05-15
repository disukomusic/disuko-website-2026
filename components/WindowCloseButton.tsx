import React, {ReactNode} from "react";
import { useCurrentWindow, useWindowContext, playAudio } from "@/components/WindowSystem";

export interface WindowCloseButtonProps {
    className?: string;
    children?: ReactNode;
    soundClick?: string;
    muteSounds?: boolean;
}
export const WindowCloseButton = ({ className, children, soundClick, muteSounds = false }: WindowCloseButtonProps) => {
    const windowId = useCurrentWindow();
    const { closeWindow, defaultSounds, globalMute } = useWindowContext();

    const handleClick = () => {
        playAudio(soundClick || defaultSounds.click, muteSounds || globalMute);
        closeWindow(windowId);
    };

    return (
        <div className={className} onClick={handleClick} style={{ cursor: 'pointer' }}>
            {children}
        </div>
    );
};