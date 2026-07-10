import React, { useState, useRef, useEffect, ReactNode, MouseEvent as ReactMouseEvent } from 'react';

interface CustomCSSProperties extends React.CSSProperties {
    WebkitUserDrag?: string;
}

// Type definitions for Canvas Props
interface PortfolioCanvasProps {
    children?: ReactNode;
    background?: ReactNode;
    className?: string;
    worldWidth?: number;
    worldHeight?: number;
}

// --- CANVAS COMPONENT ---
export function PortfolioCanvas({
                                    children,
                                    background,
                                    className,
                                    worldWidth = 4000,
                                    worldHeight = 4000
                                }: PortfolioCanvasProps) {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

    const containerRef = useRef<HTMLDivElement>(null);
    const dragStart = useRef({ x: 0, y: 0 });
    const lastMouse = useRef({ x: 0, y: 0, time: 0 });
    const velocity = useRef({ x: 0, y: 0 });

    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setViewportSize({ width, height });
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
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
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;

            const now = performance.now();
            const dt = now - lastMouse.current.time;

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

            const friction = 0.92;

            const applyPhysics = () => {
                velocity.current.x *= friction;
                velocity.current.y *= friction;

                const speed = Math.sqrt(
                    velocity.current.x ** 2 + velocity.current.y ** 2
                );

                if (speed > 0.05) {
                    setPosition((prev) => ({
                        x: prev.x + velocity.current.x * 16,
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

    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    const minimapSize = 150;
    const scaleX = minimapSize / worldWidth;
    const scaleY = minimapSize / worldHeight;

    const mapViewportX = (-position.x + (worldWidth / 2) - (viewportSize.width / 2)) * scaleX;
    const mapViewportY = (-position.y + (worldHeight / 2) - (viewportSize.height / 2)) * scaleY;
    const mapViewportWidth = viewportSize.width * scaleX;
    const mapViewportHeight = viewportSize.height * scaleY;

    const containerStyle: CustomCSSProperties = {
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '400px',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitUserDrag: 'none',
        touchAction: 'none'
    };

    return (
        <div
            ref={containerRef}
            className={className}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            style={containerStyle}
            onMouseDown={handleMouseDown}
        >
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
                {background}
            </div>

            <div
                draggable={false}
                style={{
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    position: 'absolute',
                    inset: 0,
                    zIndex: 1,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    willChange: 'transform'
                }}
            >
                <div style={{ position: 'absolute', left: '50%', top: '50%' }}>
                    {children}
                </div>
            </div>

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
                    pointerEvents: 'none'
                }}
            >
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
                        transform: 'translate(0, 0)',
                    }}
                />
            </div>
        </div>
    );
}

// Type definitions for Item Props
interface PortfolioItemProps {
    priority?: number;
    x?: number;
    y?: number;
    imageSlot?: ReactNode;
    descriptionSlot?: ReactNode;
    linkSlot?: ReactNode;
    onItemClick?: () => void;
    className?: string;
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
                              }: PortfolioItemProps) {
    const scale = 1 + (Math.max(1, Math.min(3, priority)) - 1) * 0.5;

    const itemStyle: CustomCSSProperties = {
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: 'center center',
        transition: 'transform 0.2s ease, filter 0.2s ease',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitUserDrag: 'none'
    };

    return (
        <div
            className={className}
            style={itemStyle}
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