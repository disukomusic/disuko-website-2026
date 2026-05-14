"use client";

import React, { useMemo, Suspense, useEffect, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, useGLTF, Html, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

// --- Added strictly typed props for the inner model to fix TS error ---
interface InnerModelProps {
    url: string;
    renderMode: string;
    wireframeColor: string;
    flatColor: string;
    animationName?: string;
}

// --- Inner Model Wrapper ---
function Model({
                   url,
                   renderMode,
                   wireframeColor,
                   flatColor,
                   animationName
               }: InnerModelProps) {
    const { scene, animations } = useGLTF(url);

    const processedSceneForModes = useMemo(() => {
        const freshClone = clone(scene);
        const isWireframe = renderMode === 'wireframe';

        freshClone.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                const sourceMaterial = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
                const sourceAsBasicInput = sourceMaterial as unknown as { map?: THREE.Texture | null };

                // Create the primary material
                let newMaterial;
                if (isWireframe) {
                    newMaterial = new THREE.MeshBasicMaterial({ color: wireframeColor, wireframe: true });
                } else if (sourceMaterial) {
                    newMaterial = new THREE.MeshStandardMaterial({
                        color: new THREE.Color(flatColor ?? 0xffffff),
                        map: sourceAsBasicInput?.map ?? null,
                        emissive: 0x000000,
                        emissiveIntensity: 0,
                        roughness: 1,
                        metalness: 0,
                    });
                } else {
                    newMaterial = new THREE.MeshStandardMaterial({
                        color: new THREE.Color(flatColor ?? 0xffffff)
                    });
                }

                (newMaterial as any).skinning = (mesh as THREE.SkinnedMesh).isSkinnedMesh;
                mesh.material = newMaterial;
            }
        });

        return freshClone;
    }, [scene, renderMode, wireframeColor, flatColor]);

    useEffect(() => {
        return () => {
            processedSceneForModes.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    if (mesh.material) {
                        Array.isArray(mesh.material)
                            ? mesh.material.forEach(m => m.dispose())
                            : mesh.material.dispose();
                    }
                }
            });
        };
    }, [processedSceneForModes]);

    const { actions, names } = useAnimations(animations, processedSceneForModes);

    const selectedAnimation = useMemo(() => {
        return (animationName && names.includes(animationName)) ? animationName : names[0];
    }, [animationName, names]);

    useEffect(() => {
        if (!selectedAnimation || !actions[selectedAnimation]) return;
        const selectedAction = actions[selectedAnimation];

        Object.values(actions).forEach((action) => action?.stop());
        selectedAction.reset().fadeIn(0.3).play();

        return () => { selectedAction.fadeOut(0.3); };
    }, [actions, selectedAnimation]);

    return (
        <primitive object={processedSceneForModes} dispose={null} />
    );
}

// --- Outer Wrapper Component ---
export interface ModelViewerProps {
    className?: string;
    modelUrl?: string;
    renderMode?: 'wireframe' | 'flat';
    wireframeColor?: string;
    flatColor?: string;
    animationName?: string;
}

export function ModelViewer({
                                className,
                                modelUrl = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb',
                                renderMode = 'flat',
                                wireframeColor = '#333333',
                                flatColor = '#ffffff',
                                animationName
                            }: ModelViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    // Added isMounted state to prevent SSR crashes in Vercel
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted) return;
        const observer = new IntersectionObserver(
            ([entry]) => setIsVisible(entry.isIntersecting),
            { rootMargin: '200px' }
        );
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [isMounted]);

    // Return an empty div during Server-Side Rendering
    if (!isMounted) {
        return <div className={className} style={{ width: '100%', height: '100%', minHeight: '300px' }} />;
    }

    return (
        <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', minHeight: '300px' }}>
            {isVisible && (
                <Canvas
                    dpr={0.5} // Forces half resolution
                    gl={{ antialias: false }} // Disables smoothing to allow sharp pixels
                    style={{ imageRendering: 'pixelated' }} // Nearest-neighbor scaling
                    camera={{ fov: 20 }}
                >
                    <Suspense fallback={<Html center>Loading 3D Model...</Html>}>
                        <Stage preset="rembrandt" intensity={1.8} environment="city" shadows={false} adjustCamera={false}>
                            <Model
                                url={modelUrl}
                                renderMode={renderMode}
                                wireframeColor={wireframeColor}
                                flatColor={flatColor}
                                animationName={animationName}

                            />
                        </Stage>
                    </Suspense>

                    <OrbitControls target={[0, 0.05, 0]} makeDefault autoRotate={false} enableZoom={false} enablePan={false} minDistance={3} maxDistance={3} />
                </Canvas>
            )}
        </div>
    );
}