import React, {ReactNode} from "react";

export interface TaskbarContainerProps {
    className?: string;
    children?: ReactNode;
}
export const TaskbarContainer = ({ className, children }: TaskbarContainerProps) => {
    return (
        <div className={className}>
            {children}
        </div>
    );
};

