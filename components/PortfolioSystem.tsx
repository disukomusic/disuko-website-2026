import React, { useState, useRef, useEffect, useLayoutEffect, ReactNode, MouseEvent as ReactMouseEvent, createContext, useContext, useId, useCallback } from 'react';
import { DataProvider } from '@plasmicapp/host';

interface CustomCSSProperties extends React.CSSProperties {
    WebkitUserDrag?: string;
}

// --- SHARED CONTEXTS ---
export const PortfolioContext = createContext<any[]>([]);

export const PortfolioLayoutContext = createContext<{
    registerSize: (id: string, w: number, h: number) => void;
}>({ registerSize: () => {} });

export interface PortfolioItemType {
    _id?: string;
    Title: string;
    Year: string;
    Images: string[];
    Desc: string;
    computedX?: number;
    computedY?: number;
    opacity?: number;
}

// --- CANVAS COMPONENT ---
interface PortfolioCanvasProps {
    children?: ReactNode;
    background?: ReactNode;
    className?: string;
    worldWidth?: number;
    worldHeight?: number;
}

export function PortfolioCanvas({
                                    children,
                                    background,
                                    className,
                                    worldWidth = 4000,
                                    worldHeight = 4000
                                }: PortfolioCanvasProps) {
    const items = useContext(PortfolioContext);

    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [isMinimapDragging, setIsMinimapDragging] = useState(false);
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

    const containerRef = useRef<HTMLDivElement>(null);
    const dragStart = useRef({ x: 0, y: 0 });
    const lastMouse = useRef({ x: 0, y: 0, time: 0 });
    const velocity = useRef({ x: 0, y: 0 });
    const animationFrameRef = useRef<number | null>(null);

    // Clamp boundaries so we can't scroll off into the abyss
    const clampPosition = (pos: { x: number, y: number }, currentZoom: number) => {
        const limitX = Math.max(0, (worldWidth * currentZoom - viewportSize.width) / 2);
        const limitY = Math.max(0, (worldHeight * currentZoom - viewportSize.height) / 2);
        return {
            x: Math.max(-limitX, Math.min(limitX, pos.x)),
            y: Math.max(-limitY, Math.min(limitY, pos.y))
        };
    };

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setViewportSize({ width, height });
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Zooming (Mouse Wheel)
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const zoomDelta = e.deltaY * -0.001;
            setZoom(prevZoom => {
                const newZoom = Math.max(0.3, Math.min(prevZoom + zoomDelta, 3)); // Zoom limits (0.3x to 3x)
                setPosition(prevPos => clampPosition(prevPos, newZoom));
                return newZoom;
            });
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [viewportSize]);

    // Canvas Dragging
    const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
        // Prevent canvas drag if clicking the minimap
        if ((e.target as HTMLElement).closest('.minimap-container')) return;

        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        setIsDragging(true);
        dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        lastMouse.current = { x: e.clientX, y: e.clientY, time: performance.now() };
        velocity.current = { x: 0, y: 0 };
    };

    // Minimap Dragging
    const handleMinimapMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        setIsMinimapDragging(true);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const now = performance.now();
                const dt = now - lastMouse.current.time;
                if (dt > 0) {
                    velocity.current = {
                        x: (e.clientX - lastMouse.current.x) / dt,
                        y: (e.clientY - lastMouse.current.y) / dt
                    };
                }
                lastMouse.current = { x: e.clientX, y: e.clientY, time: now };
                setPosition(clampPosition({
                    x: e.clientX - dragStart.current.x,
                    y: e.clientY - dragStart.current.y
                }, zoom));
            }
            else if (isMinimapDragging) {
                // Map mouse movement back to world coordinates
                const scaleX = minimapSize / (worldWidth * zoom);
                const scaleY = minimapSize / (worldHeight * zoom);
                setPosition(prev => clampPosition({
                    x: prev.x - (e.movementX / scaleX),
                    y: prev.y - (e.movementY / scaleY)
                }, zoom));
            }
        };

        const handleMouseUp = () => {
            setIsMinimapDragging(false);
            if (!isDragging) return;
            setIsDragging(false);

            const friction = 0.92;
            const applyPhysics = () => {
                velocity.current.x *= friction;
                velocity.current.y *= friction;
                const speed = Math.sqrt(velocity.current.x ** 2 + velocity.current.y ** 2);

                if (speed > 0.05) {
                    setPosition(prev => clampPosition({
                        x: prev.x + velocity.current.x * 16,
                        y: prev.y + velocity.current.y * 16
                    }, zoom));
                    animationFrameRef.current = requestAnimationFrame(applyPhysics);
                }
            };
            animationFrameRef.current = requestAnimationFrame(applyPhysics);
        };

        if (isDragging || isMinimapDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isMinimapDragging, viewportSize, zoom]);

    // Minimap Calculations
    const minimapSize = 150;
    const scaleX = minimapSize / worldWidth;
    const scaleY = minimapSize / worldHeight;

    // Viewport box on the minimap
    const mapViewportWidth = (viewportSize.width / zoom) * scaleX;
    const mapViewportHeight = (viewportSize.height / zoom) * scaleY;
    const mapViewportX = (-position.x / zoom + worldWidth / 2) * scaleX - (mapViewportWidth / 2);
    const mapViewportY = (-position.y / zoom + worldHeight / 2) * scaleY - (mapViewportHeight / 2);

    const hasMoved = position.x !== 0 || position.y !== 0 || zoom !== 1;

    return (
        <div ref={containerRef} className={className} style={{ overflow: 'hidden', position: 'relative', width: '100%', height: '100%', minHeight: '400px', userSelect: 'none', touchAction: 'none' }} onMouseDown={handleMouseDown}>

            {/* Background */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
                {background}
            </div>

            {/* Draggable World */}
            <div style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`, position: 'absolute', inset: 0, zIndex: 1, cursor: isDragging ? 'grabbing' : 'grab', willChange: 'transform', transformOrigin: 'center center' }}>
                <div style={{ position: 'absolute', left: '50%', top: '50%' }}>
                    {children}
                </div>
            </div>

            {/* Minimap UI */}
            <div className="minimap-container" style={{ position: 'absolute', bottom: '96px', right: '20px', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>

                <div style={{ width: `${minimapSize}px`, height: `${minimapSize}px`, backgroundColor: 'rgba(0, 0, 0, 0.6)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', overflow: 'hidden', position: 'relative', cursor: isMinimapDragging ? 'grabbing' : 'grab' }} onMouseDown={handleMinimapMouseDown}>

                    {/* Render dots for each item */}
                    {items.map((item, i) => {
                        // Assuming item.computedX/Y are relative to 0,0 center
                        const dotX = ((item.computedX || 0) + worldWidth / 2) * scaleX;
                        const dotY = ((item.computedY || 0) + worldHeight / 2) * scaleY;
                        return (
                            <div key={i} style={{ position: 'absolute', left: dotX, top: dotY, width: '4px', height: '4px', backgroundColor: '#fff', borderRadius: '50%', transform: 'translate(-50%, -50%)' }} />
                        );
                    })}

                    {/* Viewport Box */}
                    <div style={{ position: 'absolute', left: `${mapViewportX}px`, top: `${mapViewportY}px`, width: `${mapViewportWidth}px`, height: `${mapViewportHeight}px`, border: '2px solid white', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: '2px', pointerEvents: 'none' }} />
                </div>

                {/* Reset View Button */}
                <div style={{
                    opacity: hasMoved ? 1 : 0, transition: 'opacity 0.2s', pointerEvents: hasMoved ? 'auto' : 'none', padding: '4px 8px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '10px', borderRadius: '4px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)'
                }} onClick={() => { setPosition({ x: 0, y: 0 }); setZoom(1); }}>
                    Reset View
                </div>

            </div>
        </div>
    );
}

// --- PORTFOLIO ROOT COMPONENT ---
export function PortfolioRoot({ apiUrl, gap = 24, children, className }: any) {
    const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
    const [measuredSizes, setMeasuredSizes] = useState<Record<string, {w: number, h: number}>>({});
    const [packedItems, setPackedItems] = useState<any[]>([]);

    // 1. Fetch Data and inject a unique ID for measuring
    useEffect(() => {
        if (!apiUrl) return;
        fetch(apiUrl)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const dataWithIds = data.map(d => ({ ...d, _id: crypto.randomUUID() }));
                    setPortfolioItems(dataWithIds);
                }
            })
            .catch(err => console.error("Failed to fetch portfolio:", err));
    }, [apiUrl]);

    // 2. Safely collect the true sizes of each rendered item
    const registerSize = useCallback((id: string, w: number, h: number) => {
        setMeasuredSizes(prev => {
            if (prev[id]?.w === w && prev[id]?.h === h) return prev;
            return { ...prev, [id]: { w, h } };
        });
    }, []);

    // 3. Word Cloud / Archimedean Spiral Packing Algorithm
    useEffect(() => {
        if (portfolioItems.length === 0) return;

        // Math to check if two rectangles overlap
        const collides = (rect1: any, rect2: any, minGap: number) => {
            return !(
                rect1.x + rect1.w / 2 + minGap <= rect2.x - rect2.w / 2 ||
                rect1.x - rect1.w / 2 - minGap >= rect2.x + rect2.w / 2 ||
                rect1.y + rect1.h / 2 + minGap <= rect2.y - rect2.h / 2 ||
                rect1.y - rect1.h / 2 - minGap >= rect2.y + rect2.h / 2
            );
        };

        const placed: any[] = [];
        const newPacked = portfolioItems.map((item) => {
            const size = measuredSizes[item._id];

            // If the browser hasn't measured it yet, keep it hidden at 0,0
            if (!size) return { ...item, computedX: 0, computedY: 0, opacity: 0 };

            let angle = 0;
            let radius = 0;
            const step = 0.5; // Radians to spin per step
            const a = 4;      // Tightness of the spiral

            let x = 0, y = 0;
            let isPlaced = false;

            // Spiral outward until we find a pocket where it fits perfectly
            while (!isPlaced) {
                x = radius * Math.cos(angle);
                y = radius * Math.sin(angle);

                const candidate = { x, y, w: size.w, h: size.h };
                let hasCollision = false;

                for (const p of placed) {
                    if (collides(candidate, p, gap)) {
                        hasCollision = true;
                        break;
                    }
                }

                if (!hasCollision) {
                    placed.push(candidate);
                    isPlaced = true;
                } else {
                    angle += step;
                    radius = a * angle;
                }
            }

            return { ...item, computedX: x, computedY: y, opacity: 1 };
        });

        setPackedItems(newPacked);
    }, [portfolioItems, measuredSizes, gap]);

    return (
        <PortfolioLayoutContext.Provider value={{ registerSize }}>
            <PortfolioContext.Provider value={packedItems}>
                <DataProvider name="portfolioItems" data={packedItems}>
                    <div className={className} style={{ display: 'contents' }}>
                        {children}
                    </div>
                </DataProvider>
            </PortfolioContext.Provider>
        </PortfolioLayoutContext.Provider>
    );
}
// --- ITEM COMPONENT ---
export function PortfolioItem({
                                  itemId,
                                  computedX = 0,
                                  computedY = 0,
                                  opacity = 0,
                                  children,
                                  onItemClick,
                                  className
                              }: any) {
    const { registerSize } = useContext(PortfolioLayoutContext);
    const ref = useRef<HTMLDivElement>(null);
    const fallbackId = useId();
    const idToUse = itemId || fallbackId;

    useLayoutEffect(() => {
        if (!ref.current) return;
        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    registerSize(idToUse, width, height);
                }
            }
        });
        observer.observe(ref.current);

        const handleImageLoad = () => {
            if (ref.current) {
                const { width, height } = ref.current.getBoundingClientRect();
                if (width > 0 && height > 0) registerSize(idToUse, width, height);
            }
        };
        ref.current.addEventListener('load', handleImageLoad, true);

        return () => {
            observer.disconnect();
            if (ref.current) ref.current.removeEventListener('load', handleImageLoad, true);
        };
    }, [idToUse, registerSize]);

    return (
        <div
            ref={ref}
            className={className}
            style={{
                position: 'absolute',
                left: computedX,
                top: computedY,
                opacity: opacity,
                height: '256px',          // BRUTE-FORCED HEIGHT
                width: 'max-content',     // WIDTH AUTOMATICALLY MATCHES IMAGE ASPECT RATIO
                transform: `translate(-50%, -50%)`,
                transformOrigin: 'center center',
                transition: 'left 0.4s ease, top 0.4s ease, opacity 0.3s ease, filter 0.2s ease',
                cursor: 'pointer',
                display: 'flex'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
            onDragStart={(e) => e.preventDefault()}
            onClick={(e) => { e.stopPropagation(); if (onItemClick) onItemClick(); }}
        >
            {children}
        </div>
    );
}

// --- PORTFOLIO ITEM VIEW COMPONENT ---
export function PortfolioItemView({
                                      item,
                                      previewSlot,
                                      expandedSlot,
                                      isExpanded = false,
                                      className
                                  }: any) {
    const itemData = item ? {
        ...item,
        mainImage: item.Images?.length > 0 ? item.Images[0] : "",
        extraImages: item.Images?.slice(1) || []
    } : {
        Title: "Studio Preview",
        Year: "2026",
        Images: [],
        Desc: "Preview mode active.",
        mainImage: "https://via.placeholder.com/512x768",
        extraImages: []
    };

    return (
        <DataProvider name="currentPortfolioItem" data={itemData}>
            {/* BRUTE-FORCED TO FILL THE 256px PARENT */}
            <div className={className} style={{ display: 'flex', height: '100%', width: '100%' }}>
                {isExpanded ? expandedSlot : previewSlot}
            </div>
        </DataProvider>
    );
}