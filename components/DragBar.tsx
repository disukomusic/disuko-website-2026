import React, { ReactNode, useContext } from "react";
import { WindowDragContext } from "./Window";

export interface DragBarProps {
    className?: string;
    children?: ReactNode;
}

export const DragBar = ({ className, children }: DragBarProps) => {
    // Grab the controls from context
    const dragControls = useContext(WindowDragContext);

    return (
        <div
            className={`plasmic-window-drag-handle ${className || ''}`}
            style={{ cursor: 'grab', touchAction: 'none' }} // touchAction: none prevents mobile scroll conflicts
            onPointerDown={(e) => dragControls?.start(e)} // Triggers the Framer Motion drag
        >
            {children}
        </div>
    );
};