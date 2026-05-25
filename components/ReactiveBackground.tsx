import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type TransitionType = "wipe" | "crossfade" | "glitch" | "zoom" | "slide";

export interface ReactiveBackgroundProps {
    className?: string;
    defaultImage?: string;
    image?: string;
    transitionType?: TransitionType;
}

export interface ReactiveBackgroundRef {
    updateBackground: (url: string) => void;
    resetBackground: () => void;
}

// THE FIX: We animate the exit state to `opacity: 0.99`. 
// This forces Framer Motion to actually run a tween for the full duration,
// keeping the old image anchored perfectly in the DOM while the new one enters.
const transitionVariants: Record<TransitionType, any> = {
    wipe: {
        initial: { clipPath: "circle(0% at 50% 50%)", zIndex: 1 },
        animate: { clipPath: "circle(150% at 50% 50%)", zIndex: 1 },
        exit: { opacity: 0.99, zIndex: 0, transition: { duration: 1.2 } },
        transition: { duration: 1.2, ease: "easeInOut" }
    },
    crossfade: {
        initial: { opacity: 0, zIndex: 1 },
        animate: { opacity: 1, zIndex: 1 },
        exit: { opacity: 0.99, zIndex: 0, transition: { duration: 0.8 } },
        transition: { duration: 0.8, ease: "easeInOut" }
    },
    glitch: {
        initial: { opacity: 0, filter: "hue-rotate(90deg) contrast(200%)", x: -20, zIndex: 1 },
        animate: {
            opacity: 1,
            filter: "hue-rotate(0deg) contrast(100%)",
            x: [20, -15, 10, -5, 0],
            zIndex: 1
        },
        exit: { opacity: 0.99, zIndex: 0, transition: { duration: 0.4 } },
        transition: { duration: 0.4, ease: "linear" }
    },
    zoom: {
        initial: { scale: 1.2, opacity: 0, zIndex: 1 },
        animate: { scale: 1, opacity: 1, zIndex: 1 },
        exit: { opacity: 0.99, scale: 1, zIndex: 0, transition: { duration: 1.0 } },
        transition: { duration: 1.0, ease: "easeOut" }
    },
    slide: {
        initial: { x: "100%", zIndex: 1 },
        animate: { x: 0, zIndex: 1 },
        exit: { opacity: 0.99, x: 0, zIndex: 0, transition: { duration: 1.0 } },
        transition: { type: "spring", damping: 25, stiffness: 120 }
    }
};

export const ReactiveBackground = forwardRef<ReactiveBackgroundRef, ReactiveBackgroundProps>(
    ({ className, image, defaultImage, transitionType = "wipe" }, ref) => {
        const [currentImage, setCurrentImage] = useState<string | undefined>(image || defaultImage);
        const [stagedImage, setStagedImage] = useState<string | undefined>(undefined);

        const stageImageLoad = (url: string | undefined) => {
            if (!url) {
                setCurrentImage(undefined);
                setStagedImage(undefined);
                return;
            }
            if (url === currentImage) return;

            setStagedImage(url);
        };

        useEffect(() => {
            stageImageLoad(image || defaultImage);
        }, [image, defaultImage]);

        useImperativeHandle(ref, () => ({
            updateBackground: (url: string) => stageImageLoad(url),
            resetBackground: () => stageImageLoad(image || defaultImage)
        }));

        const activeTransition = transitionVariants[transitionType] || transitionVariants.wipe;

        return (
            <div className={className} style={{ position: 'absolute', inset: 0, zIndex: -1, overflow: 'hidden', backgroundColor: '#000' }}>

                {/* The DOM Stager */}
                {stagedImage && stagedImage !== currentImage && (
                    <img
                        src={stagedImage}
                        alt="Preload Stager"
                        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px', zIndex: -10 }}
                        onLoad={() => setCurrentImage(stagedImage)}
                        onError={() => console.error(`Failed to stage background image: ${stagedImage}`)}
                    />
                )}

                <AnimatePresence initial={false}>
                    {currentImage && (
                        <motion.img
                            key={currentImage}
                            src={currentImage}
                            alt="Background"
                            initial={activeTransition.initial}
                            animate={activeTransition.animate}
                            exit={activeTransition.exit}
                            transition={activeTransition.transition}
                            style={{
                                position: 'absolute',
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                            }}
                        />
                    )}
                </AnimatePresence>
            </div>
        );
    }
);