import React, { useEffect } from "react";
import { useWindowStore } from "@/components/WindowSystem";

export interface UrlQueryOpenerProps {
    className?: string;
}

export const UrlQueryOpener = ({ className }: UrlQueryOpenerProps) => {
    const openWindowsByGroup = useWindowStore((state) => state.openWindowsByGroup);
    const windowStates = useWindowStore((state) => state.windowStates);

    const windowCount = Object.keys(windowStates).length;

    useEffect(() => {
        if (typeof window === "undefined") return;

        // Grab the ?group= parameter from the URL
        const params = new URLSearchParams(window.location.search);
        const groupQuery = params.get("group");

        if (groupQuery && windowCount > 0) {
            openWindowsByGroup(groupQuery);
        }
    }, [windowCount, openWindowsByGroup]);

    return <div className={className} style={{ display: "none" }} data-plasmic-name="URL Query Opener" />;
};