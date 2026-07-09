import React, { useRef, useState } from 'react';
import { useWindowStore } from './WindowSystem';

export interface GlobalVolumeControlProps {
    className?: string;
    muteIconSlot?: React.ReactNode;
    unmuteIconSlot?: React.ReactNode;
    trackSlot?: React.ReactNode;
    fillSlot?: React.ReactNode;
    thumbSlot?: React.ReactNode;
}

export function GlobalVolumeControl({
                                        className,
                                        muteIconSlot,
                                        unmuteIconSlot,
                                        trackSlot,
                                        fillSlot,
                                        thumbSlot
                                    }: GlobalVolumeControlProps) {
    const { globalVolume, setGlobalVolume, globalMute, setGlobalMute } = useWindowStore();

    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Helper to calculate percentage (0 to 1) based on pointer position
    const calculateVolume = (clientX: number) => {
        if (!containerRef.current) return 0;
        const rect = containerRef.current.getBoundingClientRect();
        // Constrain the X coordinate within bounds
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        return x / rect.width;
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        setIsDragging(true);
        const newVol = calculateVolume(e.clientX);
        setGlobalVolume(newVol);

        // Auto-unmute if they interact with the slider
        if (globalMute) setGlobalMute(false);

        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        const newVol = calculateVolume(e.clientX);
        setGlobalVolume(newVol);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDragging) return;
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    const displayProgress = globalVolume * 100;

    return (
        <div className={className} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

            {/* Mute Toggle Button */}
            <div
                onClick={() => setGlobalMute(!globalMute)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                {globalMute ? muteIconSlot : unmuteIconSlot}
            </div>

            {/* Custom Slider */}
            <div
                ref={containerRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{
                    position: 'relative',
                    cursor: globalMute ? 'not-allowed' : 'pointer',
                    touchAction: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    flexGrow: 1, // Let the slider expand to fill available width
                    minHeight: '20px',
                    opacity: globalMute ? 0.5 : 1 // Visually dim when muted
                }}
            >
                {/* 1. Background Track Slot */}
                <div style={{ position: 'absolute', width: '100%', left: 0, zIndex: 1, pointerEvents: 'none' }}>
                    {trackSlot}
                </div>

                {/* 2. Filled Progress Slot */}
                <div style={{
                    position: 'absolute',
                    width: `${displayProgress}%`,
                    left: 0,
                    overflow: 'hidden',
                    zIndex: 2,
                    pointerEvents: 'none'
                }}>
                    <div style={{ width: containerRef.current ? containerRef.current.offsetWidth : '100vw' }}>
                        {fillSlot}
                    </div>
                </div>

                {/* 3. Grabber / Thumb Slot */}
                <div style={{
                    position: 'absolute',
                    left: `${displayProgress}%`,
                    transform: 'translateX(-50%)',
                    zIndex: 3,
                    pointerEvents: 'none'
                }}>
                    {thumbSlot}
                </div>
            </div>
        </div>
    );
}