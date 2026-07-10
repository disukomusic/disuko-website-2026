import React, { useState, useRef, useEffect } from 'react';

// --- CANVAS COMPONENT ---
export function PortfolioCanvas({
                                    children,
                                    background,
                                    className,
                                    worldWidth = 4000,
                                    worldHeight = 4000
                                }) {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

    const containerRef = useRef(null);
    const dragStart = useRef({ x: 0, y: 0 });
    const lastMouse = useRef({ x: 0, y: 0, time: 0 });
    const velocity = useRef({ x: 0, y: 0 });
    const animationFrameRef = useRef(null);

    // Track the viewport size for the minimap
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setViewportSize({ width, height });
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const handleMouseDown = (e) => {
        // Cancel any existing momentum when the user clicks
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        setIsDragging(true);
        dragStart.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
        lastMouse.current = {
            x: e.clientX,
            y: e.clientY,
            time: performance.now()
        };
        velocity.current = { x: 0, y: 0 };
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;

            const now = performance.now();
            const dt = now - lastMouse.current.time;

            // Calculate velocity (pixels per millisecond)
            if (dt > 0) {
                velocity.current = {
                    x: (e.clientX - lastMouse.current.x) / dt,
                    y: (e.clientY - lastMouse.current.y) / dt
                };
            }

            lastMouse.current = { x: e.clientX, y: e.clientY, time: now };

            setPosition({
                x: e.clientX - dragStart.current.x,
                y: e.clientY - dragStart.current.y
            });
        };

        const handleMouseUp = () => {
            if (!isDragging) return;
            setIsDragging(false);

            // Apply Inertia / Momentum
            const friction = 0.92; // Adjust between 0.8 (heavy) and 0.99 (slippery)

            const applyPhysics = () => {
                velocity.current.x *= friction;
                velocity.current.y *= friction;

                const speed = Math.sqrt(
                    velocity.current.x ** 2 + velocity.current.y ** 2
                );

                // Stop animating when velocity is low enough
                if (speed > 0.05) {
                    setPosition((prev) => ({
                        x: prev.x + velocity.current.x * 16, // Approx 16ms per frame at 60fps
                        y: prev.y + velocity.current.y * 16
                    }));
                    animationFrameRef.current = requestAnimationFrame(applyPhysics);
                }
            };

            animationFrameRef.current = requestAnimationFrame(applyPhysics);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    // Cleanup animation frame on unmount
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    // --- Minimap Calculations ---
    const minimapSize = 150; // pixel size of the minimap
    const scaleX = minimapSize / worldWidth;
    const scaleY = minimapSize / worldHeight;

    // Calculate the viewport box position on the minimap
    // Offset by half the world size because the canvas starts at (0,0) center
    const mapViewportX = (-position.x + (worldWidth / 2) - (viewportSize.width / 2)) * scaleX;
    const mapViewportY = (-position.y + (worldHeight / 2) - (viewportSize.height / 2)) * scaleY;
    const mapViewportWidth = viewportSize.width * scaleX;
    const mapViewportHeight = viewportSize.height * scaleY;

    return (
        <div
            ref={containerRef}
            className={className}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            style={{
                overflow: 'hidden',
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: '400px',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitUserDrag: 'none',
                touchAction: 'none'
            }}
            onMouseDown={handleMouseDown}
        >
            {/* Background Slot */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
                {background}
            </div>

            {/* Panning Layer */}
            <div
                draggable={false}
                style={{
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    position: 'absolute',
                    inset: 0,
                    zIndex: 1,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    willChange: 'transform' // Hardware acceleration optimization
                }}
            >
                {/* Center anchor point for easier item positioning */}
                <div style={{ position: 'absolute', left: '50%', top: '50%' }}>
                    {children}
                </div>
            </div>

            {/* Mini Map */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '20px',
                    right: '20px',
                    width: `${minimapSize}px`,
                    height: `${minimapSize}px`,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    zIndex: 10,
                    overflow: 'hidden',
                    pointerEvents: 'none' // Let clicks pass through if needed
                }}
            >
                {/* Viewport Indicator */}
                <div
                    style={{
                        position: 'absolute',
                        left: `${mapViewportX}px`,
                        top: `${mapViewportY}px`,
                        width: `${mapViewportWidth}px`,
                        height: `${mapViewportHeight}px`,
                        border: '2px solid white',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '2px',
                        transform: 'translate(0, 0)', // keep it cheap to render
                    }}
                />
            </div>
        </div>
    );
}

// --- ITEM COMPONENT ---
export function PortfolioItem({
                                  priority = 1,
                                  x = 0,
                                  y = 0,
                                  imageSlot,
                                  descriptionSlot,
                                  linkSlot,
                                  onItemClick,
                                  className
                              }) {
    const scale = 1 + (Math.max(1, Math.min(3, priority)) - 1) * 0.5;

    return (
        <div
            className={className}
            style={{
                position: 'absolute',
                // Now x and y are relative to the center of the canvas
                left: x,
                top: y,
                transform: `translate(-50%, -50%) scale(${scale})`,
                transformOrigin: 'center center',
                transition: 'transform 0.2s ease, filter 0.2s ease',
                cursor: 'pointer',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitUserDrag: 'none'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
            onDragStart={(e) => e.preventDefault()}
            onClick={(e) => {
                e.stopPropagation();
                if (onItemClick) {
                    onItemClick();
                }
            }}
        >
            <div className="item-image" style={{ pointerEvents: 'none' }}>
                {imageSlot}
            </div>
            <div className="item-description">{descriptionSlot}</div>
            <div className="item-link" style={{ position: 'relative', zIndex: 2 }}>
                {linkSlot}
            </div>
        </div>
    );
}