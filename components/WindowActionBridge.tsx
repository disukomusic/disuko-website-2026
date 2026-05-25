import React, { forwardRef, useImperativeHandle } from "react";
import { useWindowContext } from "@/components/WindowSystem";

export interface WindowActionBridgeProps {
    className?: string;
}

// Define the actions we are exposing to Plasmic
export interface WindowActionRefs {
    minimizeWindows: (patterns: string) => void;
    closeWindows: (patterns: string) => void;

}

export const WindowActionBridge = forwardRef<WindowActionRefs, WindowActionBridgeProps>(
    (props, ref) => {
        // Grab  global context functions
        const { minimizeWindowsByPattern } = useWindowContext();
        const { closeWindowsByPattern } = useWindowContext();

        // Wire them up to the component's ref so Plasmic can call them
        useImperativeHandle(ref, () => ({
            minimizeWindows: (patterns: string) => {
                if (minimizeWindowsByPattern) {
                    minimizeWindowsByPattern(patterns);
                }
            },
            closeWindows: (patterns: string) => {
                if (closeWindowsByPattern) {
                    closeWindowsByPattern(patterns);
                }
            }
        }));

        // Render an invisible div so it doesn't mess up layout, 
        // but still exists on the canvas to be selected.
        return <div className={props.className} style={{ display: "none" }} />;
    }
);