import React, { ReactNode } from "react";
import { WindowGroupContext } from "@/components/WindowSystem";

export interface WindowGroupProps {
    className?: string;
    children?: ReactNode;
    groupName: string;
}

export const WindowGroup = ({ className, children, groupName }: WindowGroupProps) => {
    return (
        <WindowGroupContext.Provider value={groupName}>
            <div className={className} style={{ display: "contents" }}>
                {children}
            </div>
        </WindowGroupContext.Provider>
    );
};