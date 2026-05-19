import React, { useRef, useEffect } from "react";

export interface ImageCarouselProps {
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
    leftArrow?: React.ReactNode;
    rightArrow?: React.ReactNode;
    slideGap?: number | string; // Accept string just in case Plasmic passes it as one
}

export function ImageCarousel({
                                  className = "",
                                  style,
                                  children,
                                  leftArrow,
                                  rightArrow,
                                  slideGap = 0,
                              }: ImageCarouselProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const animFrame = useRef<number>();

    // Interaction state for desktop mouse swiping
    const isDragging = useRef(false);
    const startX = useRef(0);
    const scrollLeftStart = useRef(0);

    // Safely enforce gap as a number to prevent string concatenation bugs
    const gap = Number(slideGap) || 0;

    // Cleanup animations if the component unmounts
    useEffect(() => {
        return () => {
            if (animFrame.current) cancelAnimationFrame(animFrame.current);
        };
    }, []);

    // Custom Physics Scroll with "Ease-Out-Back" Bounce
    const scrollToTarget = (targetScroll: number) => {
        const track = trackRef.current;
        if (!track) return;

        if (animFrame.current) cancelAnimationFrame(animFrame.current);

        const startScroll = track.scrollLeft;
        const distance = targetScroll - startScroll;
        const duration = 500; // Animation speed in ms
        let startTime: number | null = null;

        // Temporarily disable CSS snapping so it doesn't fight our custom animation
        track.style.scrollSnapType = 'none';

        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);

            // Premium Bounce Math (easeOutBack)
            const c1 = 1.70158;
            const c3 = c1 + 1;
            const ease = 1 + c3 * Math.pow(percentage - 1, 3) + c1 * Math.pow(percentage - 1, 2);

            if (trackRef.current) {
                trackRef.current.scrollLeft = startScroll + distance * ease;
            }

            if (progress < duration) {
                animFrame.current = window.requestAnimationFrame(step);
            } else {
                // Once done, re-enable snapping to lock it in
                if (trackRef.current) trackRef.current.style.scrollSnapType = 'x mandatory';
            }
        };

        animFrame.current = window.requestAnimationFrame(step);
    };

    const nextSlide = () => {
        if (!trackRef.current) return;
        const slideWidth = trackRef.current.clientWidth + gap;
        const currentScroll = trackRef.current.scrollLeft;
        // Snap to nearest index to avoid rounding drift
        const currentIndex = Math.round(currentScroll / slideWidth);
        scrollToTarget((currentIndex + 1) * slideWidth);
    };

    const prevSlide = () => {
        if (!trackRef.current) return;
        const slideWidth = trackRef.current.clientWidth + gap;
        const currentScroll = trackRef.current.scrollLeft;
        const currentIndex = Math.round(currentScroll / slideWidth);
        scrollToTarget((currentIndex - 1) * slideWidth);
    };

    // --- Desktop Swipe Logic ---
    const onPointerDown = (e: React.PointerEvent) => {
        if (!trackRef.current) return;
        isDragging.current = true;
        startX.current = e.pageX;
        scrollLeftStart.current = trackRef.current.scrollLeft;

        if (animFrame.current) cancelAnimationFrame(animFrame.current);
        trackRef.current.style.scrollSnapType = 'none'; // Allow free dragging
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!isDragging.current || !trackRef.current) return;
        e.preventDefault(); // Prevent text highlighting
        const x = e.pageX;
        const walk = (x - startX.current) * 1.2; // Drag multiplier
        trackRef.current.scrollLeft = scrollLeftStart.current - walk;
    };

    const onPointerUp = () => {
        if (!isDragging.current || !trackRef.current) return;
        isDragging.current = false;
        // Re-enabling snapping forces the browser to beautifully glide to the nearest slide!
        trackRef.current.style.scrollSnapType = 'x mandatory';
    };

    const hasCustomLeftArrow = React.Children.toArray(leftArrow).length > 0;
    const hasCustomRightArrow = React.Children.toArray(rightArrow).length > 0;

    return (
        <div
            className={className}
            style={{
                position: "relative",
                width: "100%", // Ensures it fills its container horizontally
                ...style       // Let Plasmic safely apply "Hug Content" or "Fixed" heights here
            }}
        >
            <style>{`
                .plasmic-carousel-track {
                    display: flex;
                    width: 100%;
                    gap: ${gap}px;
                    overflow-x: auto;
                    scroll-snap-type: x mandatory;
                    scrollbar-width: none; /* Firefox */
                    -ms-overflow-style: none; /* IE */
                    cursor: grab;
                    align-items: flex-start; /* CRITICAL: Allows children to dictate their natural height without squishing */
                }
                
                .plasmic-carousel-track:active {
                    cursor: grabbing;
                }
                
                .plasmic-carousel-track::-webkit-scrollbar {
                    display: none; /* Chrome/Safari */
                }
                
                .plasmic-carousel-track > * {
                    flex: 0 0 100% !important;
                    min-width: 100% !important; 
                    height: auto !important; /* CRITICAL: Overrides any Plasmic default heights so "Hug" works */
                    scroll-snap-align: start;
                    user-select: none;
                }

                .plasmic-carousel-track img {
                    width: 100%;
                    height: auto !important;
                    object-fit: contain;
                    display: block; /* Removes invisible padding under inline images */
                    -webkit-user-drag: none;
                }
            `}</style>

            <div
                ref={trackRef}
                className="plasmic-carousel-track"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
            >
                {children}
            </div>

            {/* Left Button */}
            <div
                onClick={prevSlide}
                style={{
                    position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", zIndex: 10
                }}
            >
                {hasCustomLeftArrow ? leftArrow : (
                    <div style={{ padding: "8px 12px", background: "rgba(0,0,0,0.5)", color: "white", borderRadius: "4px", userSelect: "none" }}>
                        &#8592;
                    </div>
                )}
            </div>

            {/* Right Button */}
            <div
                onClick={nextSlide}
                style={{
                    position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", zIndex: 10
                }}
            >
                {hasCustomRightArrow ? rightArrow : (
                    <div style={{ padding: "8px 12px", background: "rgba(0,0,0,0.5)", color: "white", borderRadius: "4px", userSelect: "none" }}>
                        &#8594;
                    </div>
                )}
            </div>
        </div>
    );
}