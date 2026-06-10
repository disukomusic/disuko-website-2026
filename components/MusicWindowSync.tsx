import React, { useEffect, useContext, useRef } from 'react';
import { MusicContext } from './MusicPlayer';
import { useWindowStore } from './WindowSystem';

export interface MusicWindowSyncProps {
    className?: string;
    windowId: string;      // The ID of your music player window
    fadeDuration?: number; // Duration of the fade out in milliseconds
}

export function MusicWindowSync({ className, windowId, fadeDuration = 500 }: MusicWindowSyncProps) {
    const musicCtx = useContext(MusicContext);
    const windowCtx = useWindowStore();
    const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Fail gracefully if contexts are missing
    if (!musicCtx || !windowCtx) return null;

    const { audioRef, isPlaying, pause } = musicCtx;
    const isOpen = windowCtx.windowStates[windowId]?.isOpen;

    useEffect(() => {
        const audioEl = audioRef?.current;
        if (!audioEl) return;

        // If the window just closed and music is playing, start the fade out
        if (isOpen === false && isPlaying) {

            // Clear any existing fades to prevent glitching
            if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

            const steps = 20;
            const stepTime = fadeDuration / steps;

            // Capture the initial volume so we can restore it later
            const initialVol = audioEl.volume;
            const stepVol = initialVol / steps;

            fadeIntervalRef.current = setInterval(() => {
                if (audioEl.volume - stepVol > 0.05) {
                    // Gradually decrease volume
                    audioEl.volume -= stepVol;
                } else {
                    // Fade complete: Mute, pause, clear interval, and reset volume for next play
                    audioEl.volume = 0;
                    pause();
                    clearInterval(fadeIntervalRef.current!);

                    // CRITICAL: Restore the volume instantly while paused, 
                    // otherwise the user will hit play later and hear nothing!
                    audioEl.volume = initialVol;
                }
            }, stepTime);

        } else if (isOpen === true) {
            // If the user opens the window mid-fade, cancel the fade and restore volume
            if (fadeIntervalRef.current) {
                clearInterval(fadeIntervalRef.current);
                audioEl.volume = 1;
            }
        }

        // Cleanup function in case the component unmounts mid-fade
        return () => {
            if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        };

    }, [isOpen]); // We ONLY want this effect to run when the window's open state changes

    // This is a logic-only component, so it just returns an invisible div
    return <div className={className} style={{ display: 'none' }} />;
}