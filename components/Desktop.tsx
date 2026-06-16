import React, { createContext, useContext, useRef, ReactNode } from "react";

// 1. Context to hold the Desktop's bounding box ref
export const DesktopContext = createContext<React.RefObject<HTMLDivElement> | null>(null);

// 2. Context to inform child Windows if Mobile Mode is active
export const MobileModeContext = createContext<boolean>(false);

export const useDesktopBounds = () => {
    return useContext(DesktopContext);
};

export const useMobileMode = () => {
    return useContext(MobileModeContext);
};

export interface DesktopProps {
    className?: string;
    children?: ReactNode;
    mobileMode?: boolean; // Added mobileMode prop
}

export const Desktop = ({ className, children, mobileMode = false }: DesktopProps) => {
    const desktopRef = useRef<HTMLDivElement>(null);

    return (
        <DesktopContext.Provider value={desktopRef}>
            <MobileModeContext.Provider value={mobileMode}>
                <div
                    ref={desktopRef}
                    className={className}
                    style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        // Enable scrolling and stacking if mobileMode is true
                        overflowX: 'hidden',
                        overflowY: mobileMode ? 'auto' : 'hidden',
                        display: mobileMode ? 'flex' : 'block',
                        flexDirection: mobileMode ? 'column' : undefined,
                        padding: mobileMode ? '16px' : '0',
                        gap: mobileMode ? '16px' : '0',
                        alignItems: mobileMode ? 'center' : undefined,
                    }}
                >
                    {children}
                </div>
            </MobileModeContext.Provider>
        </DesktopContext.Provider>
    );
};