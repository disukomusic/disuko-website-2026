'use client';
import React, { useState, useRef, useEffect, createContext, useContext, forwardRef, useImperativeHandle } from 'react';
import { DataProvider } from '@plasmicapp/host';

export const MusicContext = createContext<any>(null);

export interface MusicPlayerRootRef {
    SetSong: (trackJson: any) => void;
    SetSongByUrl: (url: string) => void;
    play: () => void;
    pause: () => void;
    nextTrack: () => void;
    prevTrack: () => void;
}

export const MusicPlayerRoot = forwardRef<MusicPlayerRootRef, any>(function MusicPlayerRoot({ tracks, libraryUrl, children, className }, ref) {
    const [fetchedTracks, setFetchedTracks] = useState<any[]>([]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Fetch the tracks from Cloudflare Worker / R2 Manifest
    useEffect(() => {
        if (!libraryUrl) return;

        fetch(libraryUrl)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setFetchedTracks(data);
                }
            })
            .catch(err => console.error("Failed to fetch library from R2:", err));
    }, [libraryUrl]);

    // Combine hardcoded Plasmic tracks with the fetched cloud tracks
    const baseTracks = Array.isArray(tracks) ? tracks : [];
    const normalizedTracks = [...baseTracks, ...fetchedTracks];

    const currentTrack = normalizedTracks.length > 0 ? normalizedTracks[currentTrackIndex] : {};

    // 1. Create a stable reference to hold the latest tracks
    const tracksRef = useRef(normalizedTracks);

    // 2. Keep it updated silently without triggering ref teardowns
    useEffect(() => {
        tracksRef.current = normalizedTracks;
    }, [normalizedTracks]);

    // 3. Make the imperative handle completely stable (empty array at the bottom)
    useImperativeHandle(ref, () => ({
        SetSong: (trackJson: any) => {
            const currentTracks = tracksRef.current; // Grab the freshest data

            console.log("🎵 SetSong Triggered!");
            console.log("🎵 Track passed from Plasmic:", trackJson);

            if (!Array.isArray(currentTracks) || !currentTracks.length || !trackJson) {
                console.warn("🎵 SetSong Aborted: Missing tracks array or trackJson is null");
                return;
            }

            const targetIndex = currentTracks.findIndex((track: any) => {
                if (track === trackJson) return true;
                if (trackJson.url && track?.url === trackJson.url) return true;
                return track?.name === trackJson.name && track?.artist === trackJson.artist;
            });

            console.log("🎵 Found at Index:", targetIndex);

            if (targetIndex >= 0) {
                setCurrentTrackIndex(targetIndex);
            } else {
                console.warn("🎵 SetSong could not find a match!");
            }
        },
        SetSongByUrl: (url: string) => {
            const currentTracks = tracksRef.current;

            console.log("🎵 SetSongByUrl Triggered! URL:", url);

            if (!Array.isArray(currentTracks) || !currentTracks.length || !url) {
                console.warn("🎵 SetSongByUrl Aborted: Missing tracks array or URL is null");
                return;
            }

            // Find the index strictly by matching the URL string
            const targetIndex = currentTracks.findIndex((track: any) => track.url === url);

            console.log("🎵 Found at Index:", targetIndex);

            if (targetIndex >= 0) {
                setCurrentTrackIndex(targetIndex);
            } else {
                console.warn("🎵 SetSongByUrl could not find a match for this URL!");
            }
        },
        play: () => {
            console.log("🎵 Play Triggered!");
            play();
        },
        pause: () => {
            console.log("🎵 Pause Triggered!");
            pause();
        },
        nextTrack: () => {
            console.log("🎵 Next Track Triggered!");
            setCurrentTrackIndex((i) => (i + 1) % (tracksRef.current.length || 1));
        },
        prevTrack: () => {
            console.log("🎵 Previous Track Triggered!");
            setCurrentTrackIndex((i) => (i - 1 + (tracksRef.current.length || 1)) % (tracksRef.current.length || 1));
        }
    }), []);
    
    // Audio Event Handlers
    const onTimeUpdate = () => setCurrentTime(audioRef.current?.currentTime || 0);
    const onDurationChange = () => setDuration(audioRef.current?.duration || 0);
    const onEnded = () => nextTrack();

    // Playback Controls
    const play = () => { audioRef.current?.play(); setIsPlaying(true); };
    const pause = () => { audioRef.current?.pause(); setIsPlaying(false); };
    const togglePlay = () => isPlaying ? pause() : play();
    const stop = () => { pause(); if (audioRef.current) audioRef.current.currentTime = 0; };
    const nextTrack = () => setCurrentTrackIndex((i) => (i + 1) % (normalizedTracks.length || 1));
    const prevTrack = () => setCurrentTrackIndex((i) => (i - 1 + (normalizedTracks.length || 1)) % (normalizedTracks.length || 1));
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
        tracks: normalizedTracks,
        currentTrack,
        currentTrackIndex,
        trackCount: normalizedTracks.length,
        trackName: currentTrack.name || "No Track Selected",
        artist: currentTrack.artist || "Unknown Artist",
        artwork: currentTrack.artwork || "",
        currentTimeFormatted: formatTime(currentTime),
        durationFormatted: formatTime(duration),
        timeRemainingFormatted: formatTime(timeRemaining),
        isPlaying,
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
});

MusicPlayerRoot.displayName = 'MusicPlayerRoot';

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