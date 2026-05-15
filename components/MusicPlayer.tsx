import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { DataProvider } from '@plasmicapp/host';

// 1. Create the React Context
export const MusicContext = createContext<any>(null);

export function MusicPlayerRoot({ tracks, children, className }: any) {
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Safely fallback if no tracks are provided
    const currentTrack = (tracks && tracks.length > 0) ? tracks[currentTrackIndex] : {};

    // Audio Event Handlers
    const onTimeUpdate = () => setCurrentTime(audioRef.current?.currentTime || 0);
    const onDurationChange = () => setDuration(audioRef.current?.duration || 0);
    const onEnded = () => nextTrack();

    // Playback Controls
    const play = () => { audioRef.current?.play(); setIsPlaying(true); };
    const pause = () => { audioRef.current?.pause(); setIsPlaying(false); };
    const togglePlay = () => isPlaying ? pause() : play();
    const stop = () => { pause(); if (audioRef.current) audioRef.current.currentTime = 0; };
    const nextTrack = () => setCurrentTrackIndex((i) => (i + 1) % (tracks?.length || 1));
    const prevTrack = () => setCurrentTrackIndex((i) => (i - 1 + (tracks?.length || 1)) % (tracks?.length || 1));
    const seek = (seconds: number) => { if (audioRef.current) audioRef.current.currentTime += seconds; };

    // Function to jump to a specific time
    const seekTo = (time: number) => { if (audioRef.current) audioRef.current.currentTime = time; };

    // Auto-play when the track changes (if it was already playing)
    useEffect(() => {
        if (isPlaying && audioRef.current) {
            audioRef.current.play().catch(e => console.error("Playback failed:", e));
        }
    }, [currentTrackIndex]);

    // Added currentTime, duration, and seekTo to the context
    const contextValue = {
        isPlaying, togglePlay, play, pause, stop, nextTrack, prevTrack, seek, seekTo, currentTime, duration, audioRef
    };

    // Helper to format seconds into M:SS
    const formatTime = (time: number) => {
        if (!time || isNaN(time)) return "0:00";
        const m = Math.floor(time / 60);
        const s = Math.floor(time % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const timeRemaining = Math.max(0, duration - currentTime);

    // 2. Prepare Data for Plasmic Studio
    const plasmicData = {
        trackName: currentTrack.name || "No Track Selected",
        artist: currentTrack.artist || "Unknown Artist",
        artwork: currentTrack.artwork || "",
        currentTimeFormatted: formatTime(currentTime),
        durationFormatted: formatTime(duration),
        timeRemainingFormatted: formatTime(timeRemaining),
        isPlaying,
        // NEW: Expose raw progress percentage (0-100) for custom UI styling if needed
        progressPercentage: duration > 0 ? (currentTime / duration) * 100 : 0
    };

    return (
        <MusicContext.Provider value={contextValue}>
            <DataProvider name="musicState" data={plasmicData}>
                <div className={className}>
                    <audio
                        ref={audioRef}
                        src={currentTrack.url}
                        onTimeUpdate={onTimeUpdate}
                        onDurationChange={onDurationChange}
                        onEnded={onEnded}
                        crossOrigin="anonymous" //allow access to audio metadata for accurate duration and seeking, even if the source is from a different origin (as long as CORS headers are properly set on the server)
                    />
                    {children}
                </div>
            </DataProvider>
        </MusicContext.Provider>
    );
}

export function MusicControl({ action, children, className }: any) {
    const context = useContext(MusicContext);

    const handleClick = () => {
        if (!context) return;
        switch (action) {
            case 'playPause': context.togglePlay(); break;
            case 'play': context.play(); break;
            case 'pause': context.pause(); break;
            case 'stop': context.stop(); break;
            case 'next': context.nextTrack(); break;
            case 'prev': context.prevTrack(); break;
            case 'fastForward': context.seek(10); break;
            case 'rewind': context.seek(-10); break;
            default: break;
        }
    };

    return (
        // display: 'contents' ensures this wrapper doesn't break Plasmic flex/grid layouts
        <div className={className} onClick={handleClick} style={{ cursor: 'pointer', display: 'contents' }}>
            {children}
        </div>
    );
}

export function MusicSeekBar({ className, trackSlot, fillSlot, thumbSlot }: any) {
    const context = useContext(MusicContext);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragProgress, setDragProgress] = useState(0);

    // Fail gracefully if not wrapped in MusicPlayerRoot
    if (!context) return null;

    const { currentTime, duration, seekTo } = context;

    // Use the drag progress while the user is actively dragging, 
    // otherwise use the actual song progress.
    const actualProgress = duration > 0 ? (currentTime / duration) * 100 : 0;
    const displayProgress = isDragging ? dragProgress : actualProgress;

    // Helper to calculate percentage based on mouse/touch position
    const calculateProgress = (clientX: number) => {
        if (!containerRef.current) return 0;
        const rect = containerRef.current.getBoundingClientRect();
        // Constrain the X coordinate within the container's bounds
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        return (x / rect.width) * 100;
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!duration) return;
        setIsDragging(true);
        const newProgress = calculateProgress(e.clientX);
        setDragProgress(newProgress);
        seekTo((newProgress / 100) * duration);

        // Capture the pointer so dragging continues even if the mouse leaves the component area
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || !duration) return;
        const newProgress = calculateProgress(e.clientX);
        setDragProgress(newProgress);
        seekTo((newProgress / 100) * duration);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDragging) return;
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    return (
        <div
            ref={containerRef}
            className={className}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp} // Handle cases where drag is interrupted
            style={{
                position: 'relative',
                cursor: 'pointer',
                touchAction: 'none', // Prevents screen scrolling on mobile while dragging
                display: 'flex',
                alignItems: 'center',
                minHeight: '20px' // Ensure there's a clickable area even if the line is thin
            }}
        >
            {/* 1. Background Track Slot */}
            <div style={{ position: 'absolute', width: '100%', left: 0, zIndex: 1 }}>
                {trackSlot}
            </div>

            {/* 2. Filled Progress Slot */}
            {/* Using a wrapper div to clip the filled slot to the correct width */}
            <div style={{
                position: 'absolute',
                width: `${displayProgress}%`,
                left: 0,
                overflow: 'hidden',
                zIndex: 2
            }}>
                {/* We force the inner fillSlot to be 100% of the CONTAINER width, so backgrounds/gradients don't compress */}
                <div style={{ width: containerRef.current ? containerRef.current.offsetWidth : '100vw' }}>
                    {fillSlot}
                </div>
            </div>

            {/* 3. Grabber / Thumb Slot */}
            <div style={{
                position: 'absolute',
                left: `${displayProgress}%`,
                transform: 'translateX(-50%)', // Centers the thumb exactly on the percentage point
                zIndex: 3
            }}>
                {thumbSlot}
            </div>
        </div>
    );
}