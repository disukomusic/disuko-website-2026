import React, {
    useState,
    useRef,
    useEffect,
    useLayoutEffect,
    ReactNode,
    MouseEvent as ReactMouseEvent,
    createContext,
    useContext,
    useId,
    useCallback,
    useImperativeHandle,
    forwardRef
} from 'react';
import { DataProvider } from '@plasmicapp/host';

// --- SHARED CONTEXTS ---
export const PortfolioContext = createContext<any[]>([]);

export const PortfolioLayoutContext = createContext<{
    registerSize: (id: string, w: number, h: number) => void;
    hoveredId: string | null;
    setHoveredId: (id: string | null) => void;
}>({
    registerSize: () => {},
    hoveredId: null,
    setHoveredId: () => {}
});

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
export interface PortfolioCanvasActions {
    showExpandedView: () => void;
    hideExpandedView: () => void;
    toggleExpandedView: () => void;
}

interface PortfolioCanvasProps {
    children?: ReactNode;
    background?: ReactNode;
    expandedView?: ReactNode;
    selectedItem?: any;
    className?: string;
    worldWidth?: number;
    worldHeight?: number;
}

export const PortfolioCanvas = forwardRef<PortfolioCanvasActions, PortfolioCanvasProps>(({
                                                                                             children,
                                                                                             background,
                                                                                             expandedView,
                                                                                             selectedItem = null,
                                                                                             className,
                                                                                             worldWidth = 4000,
                                                                                             worldHeight = 4000
                                                                                         }, ref) => {
    const items = useContext(PortfolioContext);

    const [isExpanded, setIsExpanded] = useState(false);
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

    useImperativeHandle(ref, () => ({
        showExpandedView: () => setIsExpanded(true),
        hideExpandedView: () => setIsExpanded(false),
        toggleExpandedView: () => setIsExpanded(prev => !prev)
    }), []);

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

    useEffect(() => {
        const container = containerRef.current;
        if (!container || isExpanded) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const zoomFactor = Math.exp(-e.deltaY * 0.0015);

            setZoom(prevZoom => {
                const newZoom = Math.max(0.3, Math.min(prevZoom * zoomFactor, 3));
                const actualScaleChange = newZoom / prevZoom;

                const rect = container.getBoundingClientRect();
                const cursorX = e.clientX - rect.left - viewportSize.width / 2;
                const cursorY = e.clientY - rect.top - viewportSize.height / 2;

                setPosition(prevPos => {
                    const nextX = cursorX - (cursorX - prevPos.x) * actualScaleChange;
                    const nextY = cursorY - (cursorY - prevPos.y) * actualScaleChange;
                    return clampPosition({ x: nextX, y: nextY }, newZoom);
                });

                return newZoom;
            });
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [viewportSize, isExpanded]);

    const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
        if (isExpanded) return;
        if ((e.target as HTMLElement).closest('.minimap-container')) return;

        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        setIsDragging(true);
        dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        lastMouse.current = { x: e.clientX, y: e.clientY, time: performance.now() };
        velocity.current = { x: 0, y: 0 };
    };

    const handleMinimapMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        setIsMinimapDragging(true);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging && !isExpanded) {
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
            else if (isMinimapDragging && !isExpanded) {
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
            if (!isDragging || isExpanded) return;
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
    }, [isDragging, isMinimapDragging, viewportSize, zoom, isExpanded]);

    const minimapSize = 150;
    const scaleX = minimapSize / worldWidth;
    const scaleY = minimapSize / worldHeight;
    const mapViewportWidth = (viewportSize.width / zoom) * scaleX;
    const mapViewportHeight = (viewportSize.height / zoom) * scaleY;
    const mapViewportX = (-position.x / zoom + worldWidth / 2) * scaleX - (mapViewportWidth / 2);
    const mapViewportY = (-position.y / zoom + worldHeight / 2) * scaleY - (mapViewportHeight / 2);
    const hasMoved = position.x !== 0 || position.y !== 0 || zoom !== 1;

    return (
        <div
            ref={containerRef}
            className={className}
            style={{
                overflow: 'hidden',
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: '400px',
                userSelect: 'none',
                touchAction: 'none'
            }}
            onMouseDown={handleMouseDown}
        >
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
                {background}
            </div>

            <div style={{
                visibility: isExpanded ? 'hidden' : 'visible',
                pointerEvents: isExpanded ? 'none' : 'auto',
                position: 'absolute',
                inset: 0
            }}>
                <div style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                    position: 'absolute',
                    inset: 0,
                    zIndex: 1,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    willChange: 'transform',
                    transformOrigin: 'center center'
                }}>
                    <div style={{ position: 'absolute', left: '50%', top: '50%' }}>
                        {children}
                    </div>
                </div>

                <div className="minimap-container" style={{
                    position: 'absolute',
                    bottom: '96px',
                    right: '20px',
                    zIndex: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '8px'
                }}>
                    <div style={{
                        width: `${minimapSize}px`,
                        height: `${minimapSize}px`,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        position: 'relative',
                        cursor: isMinimapDragging ? 'grabbing' : 'grab'
                    }} onMouseDown={handleMinimapMouseDown}>
                        {items.map((item, i) => {
                            const dotX = ((item.computedX || 0) + worldWidth / 2) * scaleX;
                            const dotY = ((item.computedY || 0) + worldHeight / 2) * scaleY;
                            return (
                                <div key={i} style={{
                                    position: 'absolute',
                                    left: dotX,
                                    top: dotY,
                                    width: '4px',
                                    height: '4px',
                                    backgroundColor: '#fff',
                                    borderRadius: '50%',
                                    transform: 'translate(-50%, -50%)'
                                }} />
                            );
                        })}
                        <div style={{
                            position: 'absolute',
                            left: `${mapViewportX}px`,
                            top: `${mapViewportY}px`,
                            width: `${mapViewportWidth}px`,
                            height: `${mapViewportHeight}px`,
                            border: '2px solid white',
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            borderRadius: '2px',
                            pointerEvents: 'none'
                        }} />
                    </div>

                    <div style={{
                        opacity: hasMoved ? 1 : 0,
                        transition: 'opacity 0.2s',
                        pointerEvents: hasMoved ? 'auto' : 'none',
                        padding: '4px 8px',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        color: 'white',
                        fontSize: '10px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }} onClick={() => { setPosition({ x: 0, y: 0 }); setZoom(1); }}>
                        Reset View
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 100, overflowY: 'auto' }}>
                    <DataProvider name="currentSelectedItem" data={selectedItem}>
                        {expandedView}
                    </DataProvider>
                </div>
            )}
        </div>
    );
});

// --- PORTFOLIO ROOT COMPONENT ---
export function PortfolioRoot({ apiUrl, gap = 24, children, className }: any) {
    const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
    const [measuredSizes, setMeasuredSizes] = useState<Record<string, {w: number, h: number}>>({});
    const [packedItems, setPackedItems] = useState<any[]>([]);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const sizeCache = useRef<Record<string, {w: number, h: number}>>({});
    const layoutCache = useRef<Record<string, {computedX: number, computedY: number, w: number, h: number}>>({});

    useEffect(() => {
        if (!apiUrl) return;
        fetch(apiUrl)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const dataWithIds = data.map(d => ({ ...d, _id: d._id || crypto.randomUUID() }));
                    setPortfolioItems(dataWithIds);
                }
            })
            .catch(err => console.error("Failed to fetch portfolio:", err));
    }, [apiUrl]);

    const registerSize = useCallback((id: string, w: number, h: number) => {
        if (!w || !h || w <= 0 || h <= 0) return;
        if (sizeCache.current[id]?.w === w && sizeCache.current[id]?.h === h) return;
        sizeCache.current[id] = { w, h };

        setMeasuredSizes(prev => ({ ...prev, [id]: { w, h } }));
    }, []);

    useEffect(() => {
        if (portfolioItems.length === 0) return;

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

            if (!size) return { ...item, computedX: 0, computedY: 0, opacity: 0 };

            const cached = layoutCache.current[item._id];
            if (
                cached &&
                Math.abs(cached.w - size.w) < 2 &&
                Math.abs(cached.h - size.h) < 2
            ) {
                placed.push({ x: cached.computedX, y: cached.computedY, w: size.w, h: size.h });
                return { ...item, computedX: cached.computedX, computedY: cached.computedY, opacity: 1 };
            }

            let angle = 0;
            let radius = 0;
            const step = 0.5;
            const a = 4;

            let x = 0, y = 0;
            let isPlaced = false;

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
                    layoutCache.current[item._id] = {
                        computedX: x,
                        computedY: y,
                        w: size.w,
                        h: size.h
                    };
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
        <PortfolioLayoutContext.Provider value={{ registerSize, hoveredId, setHoveredId }}>
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
    const { registerSize, hoveredId, setHoveredId } = useContext(PortfolioLayoutContext);
    const ref = useRef<HTMLDivElement>(null);
    const fallbackId = useId();
    const idToUse = itemId || fallbackId;

    const isHovered = hoveredId === idToUse;
    const isOtherHovered = hoveredId !== null && !isHovered;

    // Dim to 75% opacity when another item is hovered
    const displayOpacity = isOtherHovered ? opacity * 0.75 : opacity;

    useLayoutEffect(() => {
        if (!ref.current) return;

        const measureAndRegister = () => {
            if (!ref.current) return;
            const width = ref.current.offsetWidth;
            const height = ref.current.offsetHeight;
            if (width > 0 && height > 0) {
                registerSize(idToUse, width, height);
            }
        };

        const observer = new ResizeObserver(() => {
            measureAndRegister();
        });
        observer.observe(ref.current);

        const handleImageLoad = () => {
            measureAndRegister();
        };
        ref.current.addEventListener('load', handleImageLoad, true);

        measureAndRegister();

        return () => {
            observer.disconnect();
            if (ref.current) {
                ref.current.removeEventListener('load', handleImageLoad, true);
            }
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
                opacity: displayOpacity,
                minHeight: '256px',
                height: '256px',
                width: 'max-content',
                transform: `translate(-50%, -50%) scale(${isHovered ? 1.08 : 1})`,
                transformOrigin: 'center center',
                transition: 'left 0.4s ease, top 0.4s ease, opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s ease',
                cursor: 'pointer',
                display: 'flex',
                zIndex: isHovered ? 50 : 1,
                filter: isHovered ? 'brightness(1.1)' : 'brightness(1)'
            }}
            onMouseEnter={() => setHoveredId(idToUse)}
            onMouseLeave={() => setHoveredId(null)}
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
            <div className={className} style={{ display: 'flex', height: '100%', width: '100%' }}>
                {isExpanded ? expandedSlot : previewSlot}
            </div>
        </DataProvider>
    );
}