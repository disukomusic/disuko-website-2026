import React, { useEffect } from "react";
import { useWindowStore } from "@/components/WindowSystem";

export interface WindowConfiguratorProps {
    className?: string;
    initialGlobalMute?: boolean;
    defaultSoundOpen?: string;
    defaultSoundClose?: string;
    defaultSoundFocus?: string;
    defaultSoundDragStart?: string;
    defaultSoundDragEnd?: string;
    defaultSoundClick?: string;
    defaultSoundTaskbarHover?: string;
}

export const WindowConfigurator = ({
                                       className,
                                       initialGlobalMute = false,
                                       defaultSoundOpen,
                                       defaultSoundClose,
                                       defaultSoundFocus,
                                       defaultSoundDragStart,
                                       defaultSoundDragEnd,
                                       defaultSoundClick,
                                       defaultSoundTaskbarHover
                                   }: WindowConfiguratorProps) => {

    // Grab the setter functions from your Zustand store
    const setGlobalMute = useWindowStore(state => state.setGlobalMute);
    const setDefaultSounds = useWindowStore(state => state.setDefaultSounds);

    // Whenever these props change in Plasmic, push them into the global store
    useEffect(() => {
        setGlobalMute(initialGlobalMute);
        setDefaultSounds({
            open: defaultSoundOpen,
            close: defaultSoundClose,
            focus: defaultSoundFocus,
            dragStart: defaultSoundDragStart,
            dragEnd: defaultSoundDragEnd,
            click: defaultSoundClick,
            taskbarHover: defaultSoundTaskbarHover,
        });
    }, [
        initialGlobalMute, defaultSoundOpen, defaultSoundClose, defaultSoundFocus,
        defaultSoundDragStart, defaultSoundDragEnd, defaultSoundClick, defaultSoundTaskbarHover,
        setGlobalMute, setDefaultSounds
    ]);

    // Return a hidden div so it exists on the canvas to be selected/edited, 
    // but doesn't ruin your visual layout in production.
    return <div className={className} style={{ display: "none" }} data-plasmic-name="Window Configurator" />;
};