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

        // Check the URL immediately on mount
        handleRoute();

        // Listen for browser back/forward button clicks
        window.addEventListener("popstate", handleRoute);

        return () => window.removeEventListener("popstate", handleRoute);
    }, [openWindowsByGroup, defaultRoute]);

    // Renders an invisible div so it can be placed on the Plasmic canvas
    return <div className={className} style={{ display: "none" }} data-plasmic-name="Window Router" />;
};