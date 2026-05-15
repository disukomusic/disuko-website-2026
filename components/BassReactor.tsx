import React, { useEffect, useRef, useContext, useMemo } from 'react';
import { MusicContext } from './MusicPlayer';

// Utility: Standard Linear Interpolation (Lerp)
const lerp = (start: number, end: number, amt: number) => {
    return (1 - amt) * start + amt * end;
};

// Utility: Simulates Godot's FastNoiseLite using layered sine/cosine waves
const getNoise = (time: number, seedOffset: number) => {
    return Math.sin(time * 20 + seedOffset) * Math.cos(time * 15.3 + seedOffset * 0.8);
};

export function BassReactor({
                                children,
                                className,
                                sensitivity = 1.0,
                                bassThreshold = 0.05,
                                rotationStrength = 10.0,
                                seed // Optional: Pass a specific seed, otherwise it randomizes
                            }: any) {
    const context = useContext(MusicContext);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef<number>();

    // Generate a unique seed for this specific instance if one isn't provided
    const instanceSeed = useMemo(() => seed ?? (Math.random() * 1000), [seed]);

    // Web Audio API refs
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);

    // Fail gracefully if not inside the player
    if (!context) {
        console.warn("BassReactor must be placed inside a MusicPlayerRoot.");
        return <div className={className}>{children}</div>;
    }

    const { audioRef, isPlaying } = context;

    useEffect(() => {
        const audioEl = audioRef?.current;
        if (!audioEl) return;

        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!(window as any).sharedAudioCtx) {
            (window as any).sharedAudioCtx = new AudioContext();
        }
        const audioCtx = (window as any).sharedAudioCtx;

        if (!analyserRef.current) {
            analyserRef.current = audioCtx.createAnalyser();
            // Higher fftSize (1024) gives us finer frequency bins.
            // At 44.1kHz sample rate, bins are ~43Hz wide.
            analyserRef.current.fftSize = 1024;
            const bufferLength = analyserRef.current.frequencyBinCount;
            dataArrayRef.current = new Uint8Array(bufferLength);

            if (!(audioEl as any)._audioSourceNode) {
                try {
                    const source = audioCtx.createMediaElementSource(audioEl);
                    (audioEl as any)._audioSourceNode = source;
                    source.connect(analyserRef.current);
                    analyserRef.current.connect(audioCtx.destination);
                } catch (e) {
                    console.error("Failed to connect audio source:", e);
                }
            } else {
                (audioEl as any)._audioSourceNode.connect(analyserRef.current);
            }
        }

        if (isPlaying && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        // --- Animation State Variables ---
        let currentBassEnergy = 0;
        let currentScale = 1;
        let currentX = 0;
        let currentY = 0;
        let currentRot = 0;

        const updateAnimation = () => {
            if (analyserRef.current && dataArrayRef.current && wrapperRef.current) {
                const time = performance.now() * 0.001; // Convert to seconds
                let newBassEnergy = 0;

                if (isPlaying) {
                    // Force TS to ignore the ArrayBufferLike mismatch
                    analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);

                    // Grab bins 1 through 4 (approx 43Hz to 172Hz)
                    let bassSum = 0;
                    for (let i = 1; i <= 4; i++) {
                        bassSum += dataArrayRef.current[i];
                    }

                    // Average the bass bins and normalize (0.0 to 1.0)
                    newBassEnergy = (bassSum / 4) / 255.0;
                }

                // 1. Smooth the energy input (like Godot's _bassEnergy lerp)
                currentBassEnergy = lerp(currentBassEnergy, newBassEnergy, 0.4);

                // 2. Threshold & Intensity math
                const activeEnergy = currentBassEnergy > bassThreshold ? (currentBassEnergy - bassThreshold) : 0;
                const intensity = activeEnergy * sensitivity;

                // 3. Calculate Targets using the unique instance seed
                const noiseX = getNoise(time, instanceSeed);
                const noiseY = getNoise(time, instanceSeed + 100);
                const noiseRot = getNoise(time, instanceSeed + 200);

                const targetScale = 1.0 + (intensity * 0.5); // The Scale Pulse
                const targetX = noiseX * intensity * 50.0;   // The Position Shake X
                const targetY = noiseY * intensity * 50.0;   // The Position Shake Y
                const targetRot = noiseRot * intensity * rotationStrength; // The Rotation Shake

                // 4. Smoothly lerp physical transforms
                currentScale = lerp(currentScale, targetScale, 0.5);
                currentX = lerp(currentX, targetX, 0.5);
                currentY = lerp(currentY, targetY, 0.5);
                currentRot = lerp(currentRot, targetRot, 0.5);

                // 5. Apply to DOM
                wrapperRef.current.style.transform = `translate(${currentX}px, ${currentY}px) scale(${currentScale}) rotate(${currentRot}deg)`;
            }

            requestRef.current = requestAnimationFrame(updateAnimation);
        };

        requestRef.current = requestAnimationFrame(updateAnimation);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [audioRef, isPlaying, sensitivity, bassThreshold, rotationStrength, instanceSeed]);

    return (
        <div
            className={className}
            ref={wrapperRef}
            style={{
                display: 'inline-block',
                willChange: 'transform'
            }}
        >
            {children}
        </div>
    );
}