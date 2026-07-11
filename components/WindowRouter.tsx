import React, { useEffect } from "react";
import { useWindowStore } from "@/components/WindowSystem";

export interface WindowRouterProps {
    className?: string;
    defaultRoute?: string; // e.g., "home"
}

export const WindowRouter = ({ className, defaultRoute = "" }: WindowRouterProps) => {
    const { openWindowsByGroup } = useWindowStore();

    useEffect(() => {
        const handleRoute = () => {
            // Grab the path after the domain (e.g., "music" from "disuko.cloud/music")
            const path = window.location.pathname.replace(/^\/+/, '').toLowerCase();

            if (path) {
                openWindowsByGroup(path);
            } else if (defaultRoute) {
                openWindowsByGroup(defaultRoute);
            }
        };

        // DELAY: Give the <Window /> components a moment to mount and register 
        // themselves in the store before we try to open their groups.
        const initTimeout = setTimeout(() => {
            handleRoute();
        }, 50); // 50ms is usually plenty of time for React's mount cycle

        // Listen for browser back/forward button clicks
        window.addEventListener("popstate", handleRoute);

        // Cleanup the timeout and listener on unmount
        return () => {
            clearTimeout(initTimeout);
            window.removeEventListener("popstate", handleRoute);
        };
    }, [openWindowsByGroup, defaultRoute]);

    // Renders an invisible div so it can be placed on the Plasmic canvas
    return <div className={className} style={{ display: "none" }} data-plasmic-name="Window Router" />;
};