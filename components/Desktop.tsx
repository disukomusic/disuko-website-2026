import React, { createContext, useContext, useRef, ReactNode } from "react";

// 1. Create a Context to hold the Desktop's ref
export const DesktopContext = createContext<React.RefObject<HTMLDivElement> | null>(null);

// 2. A custom hook for Windows to easily grab the boundary ref
export const useDesktopBounds = () => {
    return useContext(DesktopContext);
};

export interface DesktopProps {
    className?: string;
    children?: ReactNode;
}

export const Desktop = ({ className, children }: DesktopProps) => {
    const desktopRef = useRef<HTMLDivElement>(null);

    return (
        <DesktopContext.Provider value={desktopRef}>
            <div
                ref={desktopRef}
                className={className}
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden'
                }}
            >
                {children}
            </div>
        </DesktopContext.Provider>
    );
};