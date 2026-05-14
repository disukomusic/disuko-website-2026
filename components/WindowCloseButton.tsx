import React, {ReactNode} from "react";
import {useCurrentWindow, useWindowContext} from "@/components/WindowSystem";

export interface WindowCloseButtonProps {
    className?: string;
    children?: ReactNode;
}
export const WindowCloseButton = ({ className, children }: WindowCloseButtonProps) => {
    const windowId = useCurrentWindow();
    const { closeWindow } = useWindowContext();

    return (
        <div className={className} onClick={() => closeWindow(windowId)} style={{ cursor: 'pointer' }}>
            {children}
        </div>
    );
};

