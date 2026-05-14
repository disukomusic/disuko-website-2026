import React, { useState, useEffect, useRef, useMemo } from "react";

// Helper to handle Plasmic's uploaded image objects safely
const resolveImgSrc = (img: any): string => {
    if (!img) return "";
    if (typeof img === "string") return img;
    return img.src || "";
};

export interface MultiImageSliderProps {
    className?: string;
    style?: React.CSSProperties;
    baseImage?: any;
    midImage?: any;
    finalImage?: any;
    grabber?: React.ReactNode;
    mode?: "mask" | "fade";
    snapToSteps?: boolean;
}

export function MultiImageSlider({
                                     className = "",
                                     style,
                                     baseImage = "https://via.placeholder.com/800x600/FFB6C1/000000?text=Base+Image",
                                     midImage = "https://via.placeholder.com/800x600/ADD8E6/000000?text=Middle+Image",
                                     finalImage = "",
                                     grabber,
                                     mode = "mask",
                                     snapToSteps = false,
                                 }: MultiImageSliderProps) {
    const maskId = useMemo(() => `wavy-mask-${Math.random().toString(36).substring(2, 9)}`, []);

    // We decouple the visual slider value from the raw HTML input value
    // This allows the visual handle to "bounce" past 0 and 100 while the input stops at the edges.
    const [sliderVal, setSliderVal] = useState(0);
    const [inputVal, setInputVal] = useState(0);

    // Physics spring state
    const springState = useRef({
        current: 0,
        target: 0,
        velocity: 0,
        isDragging: false
    });

    const resolvedBase = resolveImgSrc(baseImage);
    const resolvedMid = resolveImgSrc(midImage);
    const resolvedFinal = resolveImgSrc(finalImage);
    const isThreeImageMode = Boolean(resolvedFinal && resolvedFinal.trim() !== "");

    // --- Physics Animation Loop ---
    useEffect(() => {
        let raf: number;

        const tick = () => {
            const s = springState.current;
            let stiffness = 0.5;
            let damping = 0.5; // Lower damping = more bounce

            if (s.isDragging) {
                // Tighter, heavier feel while holding the handle
                stiffness = 0.5;
                damping = 0.5;
            } else if (s.target === 0 || s.target === 100) {
                // Extra bounce allowed when hitting the absolute edges
                damping = 0.55;
            }

            // Spring math
            const force = (s.target - s.current) * stiffness;
            s.velocity += force;
            s.velocity *= damping;
            s.current += s.velocity;

            // Only trigger a React render if the handle is actually moving
            if (Math.abs(s.velocity) > 0.01 || Math.abs(s.target - s.current) > 0.01) {
                setSliderVal(s.current);
            }

            raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, []);

    // --- Intro Animation ---
    useEffect(() => {
        // Start far left
        springState.current.current = 0;
        setSliderVal(0);
        setInputVal(0);

        // Wait a beat, then set the target so the spring sweeps it gracefully
        const timer = setTimeout(() => {
            const initialTarget = isThreeImageMode ? 0 : 0;
            springState.current.target = initialTarget;
            setInputVal(initialTarget);
        }, 300);

        return () => clearTimeout(timer);
    }, [isThreeImageMode]);


    // --- Interaction Handlers ---
    const handleInteraction = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = Number(e.target.value);
        setInputVal(val);

        // The "Detent" logic: Creates a magnetic catch area while dragging
        if (snapToSteps) {
            const detentRadius = 8; // percentage distance where the magnet grabs you
            const steps = isThreeImageMode ? [0, 50, 100] : [0, 100];
            for (let step of steps) {
                if (Math.abs(val - step) < detentRadius) {
                    val = step;
                    break;
                }
            }
        }
        springState.current.target = val;
    };

    const handleDown = () => {
        springState.current.isDragging = true;
    };

    const handleUp = () => {
        springState.current.isDragging = false;

        // If user releases the mouse and snap is on, glide to the absolute nearest step
        if (snapToSteps) {
            const steps = isThreeImageMode ? [0, 50, 100] : [0, 100];
            let closest = steps[0];
            let minDiff = Math.abs(inputVal - steps[0]);

            for (let i = 1; i < steps.length; i++) {
                const diff = Math.abs(inputVal - steps[i]);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = steps[i];
                }
            }

            setInputVal(closest);
            springState.current.target = closest;
        }
    };

    // --- Calculations ---
    // We clamp the opacity values so they don't break when the spring bounces past 0 or 100.
    const clampedVal = Math.min(100, Math.max(0, sliderVal));

    let baseOpacity = 0, midOpacity = 0, finalOpacity = 0;

    // Notice currentMaskPercent uses the RAW sliderVal. This allows the mask 
    // to physically stretch past the edge of the screen during a bounce!
    let currentMaskPercent = sliderVal;
    let isFirstHalf = true;

    if (isThreeImageMode) {
        baseOpacity = Math.max(0, Math.min(1, 1 - clampedVal / 50));
        midOpacity = clampedVal <= 50 ? clampedVal / 50 : 1 - (clampedVal - 50) / 50;
        midOpacity = Math.max(0, Math.min(1, midOpacity));
        finalOpacity = Math.max(0, Math.min(1, (clampedVal - 50) / 50));

        isFirstHalf = sliderVal <= 50;
        currentMaskPercent = isFirstHalf ? sliderVal * 2 : (sliderVal - 50) * 2;
    } else {
        baseOpacity = Math.max(0, Math.min(1, 1 - clampedVal / 100));
        midOpacity = Math.max(0, Math.min(1, clampedVal / 100));
        currentMaskPercent = sliderVal;
    }

    const getWavyPath = (percent: number) => {
        const x = percent / 100;
        const maxAmp = 0.03;
        const waves = 3;

        const amp = maxAmp * Math.sin(x * Math.PI);

        let pathStr = `M 0 0 L ${x} 0 `;
        for (let i = 0; i < waves; i++) {
            const y0 = i / waves;
            const y1 = (i + 1) / waves;
            const yMid = (y0 + y1) / 2;
            const cpY1 = y0 + (y1 - y0) / 4;
            const cpY2 = y0 + (y1 - y0) * 0.75;

            pathStr += `Q ${x + amp} ${cpY1}, ${x} ${yMid} `;
            pathStr += `Q ${x - amp} ${cpY2}, ${x} ${y1} `;
        }
        pathStr += `L 0 1 Z`;
        return pathStr;
    };

    const wavyPathD = getWavyPath(currentMaskPercent);

    // Because our javascript physics loop handles sub-pixel smoothing, 
    // we completely remove CSS transitions here to avoid ghosting or input lag.
    const absoluteImageStyle: React.CSSProperties = {
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        width: "100%", height: "100%",
        objectFit: "cover",
        WebkitClipPath: mode === "mask" ? `url(#${maskId})` : "none",
        clipPath: mode === "mask" ? `url(#${maskId})` : "none"
    };

    return (
        <div className={className} style={{ position: "relative", overflow: "hidden", ...style }}>

            {mode === "mask" && (
                <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }}>
                    <defs>
                        <clipPath id={maskId} clipPathUnits="objectBoundingBox">
                            <path d={wavyPathD} />
                        </clipPath>
                    </defs>
                </svg>
            )}

            <img
                src={resolvedBase}
                style={{ width: "100%", height: "auto", display: "block", opacity: 0, pointerEvents: "none" }}
                alt="" aria-hidden="true"
            />

            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                {mode === "fade" ? (
                    <>
                        <img src={resolvedBase} style={{ ...absoluteImageStyle, opacity: baseOpacity, clipPath: "none", WebkitClipPath: "none" }} alt="" />
                        <img src={resolvedMid} style={{ ...absoluteImageStyle, opacity: midOpacity, clipPath: "none", WebkitClipPath: "none" }} alt="" />
                        {isThreeImageMode && (
                            <img src={resolvedFinal} style={{ ...absoluteImageStyle, opacity: finalOpacity, clipPath: "none", WebkitClipPath: "none" }} alt="" />
                        )}
                    </>
                ) : (
                    <>
                        {isThreeImageMode ? (
                            isFirstHalf ? (
                                <>
                                    <img src={resolvedBase} style={{...absoluteImageStyle, clipPath: "none", WebkitClipPath: "none"}} alt="" />
                                    <img src={resolvedMid} style={absoluteImageStyle} alt="" />
                                </>
                            ) : (
                                <>
                                    <img src={resolvedMid} style={{...absoluteImageStyle, clipPath: "none", WebkitClipPath: "none"}} alt="" />
                                    <img src={resolvedFinal} style={absoluteImageStyle} alt="" />
                                </>
                            )
                        ) : (
                            <>
                                <img src={resolvedBase} style={{...absoluteImageStyle, clipPath: "none", WebkitClipPath: "none"}} alt="" />
                                <img src={resolvedMid} style={absoluteImageStyle} alt="" />
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Range input is always "smooth" step="0.1" so the JS can manage the detent logic */}
            <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={inputVal}
                onChange={handleInteraction}
                onMouseDown={handleDown}
                onTouchStart={handleDown}
                onMouseUp={handleUp}
                onTouchEnd={handleUp}
                onMouseLeave={handleUp}
                style={{
                    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                    width: "100%", height: "100%",
                    opacity: 0, cursor: "ew-resize", zIndex: 20,
                    margin: 0, padding: 0
                }}
                aria-label="Image comparison slider"
            />

            <div
                style={{
                    position: "absolute", top: 0, bottom: 0, zIndex: 10,
                    pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center",
                    left: `${sliderVal}%`, transform: "translateX(-50%)"
                }}
            >
                {grabber ? grabber : (
                    <div style={{ width: "4px", height: "100%", backgroundColor: "white", display: "flex", alignItems: "flex-end", paddingBottom: "16px", justifyContent: "center", boxShadow: "0 0 5px rgba(0,0,0,0.5)" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "white", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <div style={{ display: "flex", gap: "4px" }}>
                                <div style={{ width: "2px", height: "12px", backgroundColor: "#9ca3af" }} />
                                <div style={{ width: "2px", height: "12px", backgroundColor: "#9ca3af" }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}