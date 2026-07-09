import React, { useEffect } from "react";
import { useWindowStore, type DefaultSounds } from "@/components/WindowSystem";

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
    defaultSoundMinimize?: string;
    defaultSoundMaximize?: string;
    initialGlobalVolume?: number;
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
                                       defaultSoundTaskbarHover,
                                       defaultSoundMinimize,
                                       defaultSoundMaximize,
                                       initialGlobalVolume = 1
                                   }: WindowConfiguratorProps) => {

    // Grab the setter functions from your Zustand store
    const setGlobalMute = useWindowStore(state => state.setGlobalMute);
    const setGlobalVolume = useWindowStore(state => state.setGlobalVolume);
    const setDefaultSounds = useWindowStore(state => state.setDefaultSounds);

    // Whenever these props change in Plasmic, push them into the global store
    useEffect(() => {
        setGlobalMute(initialGlobalMute);
        setGlobalVolume(initialGlobalVolume);
        const sounds = {
            open: defaultSoundOpen,
            close: defaultSoundClose,
            focus: defaultSoundFocus,
            dragStart: defaultSoundDragStart,
            dragEnd: defaultSoundDragEnd,
            click: defaultSoundClick,
            taskbarHover: defaultSoundTaskbarHover,
            minimize: defaultSoundMinimize,
            maximize: defaultSoundMaximize,
        } as DefaultSounds;
        setDefaultSounds(sounds);
    }, [
        initialGlobalMute, initialGlobalVolume, defaultSoundOpen, defaultSoundClose, defaultSoundFocus,
        defaultSoundDragStart, defaultSoundDragEnd, defaultSoundClick, defaultSoundTaskbarHover,
        defaultSoundMinimize, defaultSoundMaximize,
        setGlobalMute, setDefaultSounds
    ]);

    // Return a hidden div so it exists on the canvas to be selected/edited, 
    // but doesn't ruin your visual layout in production.
    return <div className={className} style={{ display: "none" }} data-plasmic-name="Window Configurator" />;
};