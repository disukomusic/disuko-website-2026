"use client";

import React, { useMemo, Suspense, useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame } from '@react-three/fiber'; // <-- Added useFrame here
import { OrbitControls, Stage, useGLTF, Html, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { createHoloMaterial } from './HoloMaterial'; 

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
    const holoMaterialsRef = useRef<THREE.ShaderMaterial[]>([]);

    const normalizedTransform = useMemo(() => {
        scene.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(scene);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = 0.9;
        const scale = maxDim > 0 ? targetSize / maxDim : 1;

        return {
            scale: [scale, scale, scale] as [number, number, number],
            position: [
                -center.x * scale,
                -center.y * scale,
                -center.z * scale
            ] as [number, number, number]
        };
    }, [scene]);

    const processedSceneForModes = useMemo(() => {
        const freshClone = clone(scene);
        const isWireframe = renderMode === 'wireframe';

        holoMaterialsRef.current = [];

        freshClone.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                const sourceMaterial = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
                const sourceAsBasicInput = sourceMaterial as unknown as { map?: THREE.Texture | null };

                let newMaterial;

                // Check for HOLO material slot
                if (sourceMaterial && sourceMaterial.name === 'HOLO') {
                    newMaterial = createHoloMaterial();

                    newMaterial.uniforms.meshScale.value = 1.0;
                    
                    holoMaterialsRef.current.push(newMaterial);
                }
                else if (isWireframe) {
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

    // Animate the HOLO shader time uniform
    useFrame(({ clock }) => {
        const time = clock.getElapsedTime();
        holoMaterialsRef.current.forEach((mat) => {
            if (mat.uniforms && mat.uniforms.time) {
                mat.uniforms.time.value = time;
            }
        });
    });

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
        <group position={normalizedTransform.position} scale={normalizedTransform.scale}>
            <primitive object={processedSceneForModes} dispose={null} />
        </group>
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

export interface ModelViewerRef {
    updateModel: (url: string) => void;
}

export const ModelViewer = forwardRef<ModelViewerRef, ModelViewerProps>(({
                                                                             className,
                                                                             modelUrl = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb',
                                                                             renderMode = 'flat',
                                                                             wireframeColor = '#333333',
                                                                             flatColor = '#ffffff',
                                                                             animationName
                                                                         }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    const [currentModelUrl, setCurrentModelUrl] = useState(modelUrl);

    useEffect(() => {
        setCurrentModelUrl(modelUrl);
    }, [modelUrl]);

    useImperativeHandle(ref, () => ({
        updateModel: (newUrl: string) => {
            setCurrentModelUrl(newUrl);
        }
    }));

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

    if (!isMounted) {
        return <div className={className} style={{ width: '100%', height: '100%', minHeight: '300px' }} />;
    }

    return (
        <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', minHeight: '300px' }}>
            {isVisible && (
                <Canvas
                    dpr={1}
                    gl={{ antialias: true }}
                    style={{ imageRendering: 'pixelated' }}
                    camera={{ fov: 20 }}
                >
                    <Suspense fallback={<Html center>Loading 3D Model...</Html>}>
                        <Stage preset="rembrandt" intensity={1} environment="sunset" shadows={true} adjustCamera={false}>
                            <Model
                                key={currentModelUrl} // FIX: Forces React to mount a completely fresh instance when the URL changes
                                url={currentModelUrl}
                                renderMode={renderMode}
                                wireframeColor={wireframeColor}
                                flatColor={flatColor}
                                animationName={animationName}
                            />
                        </Stage>
                    </Suspense>
                    <OrbitControls target={[0, 0, 0]} makeDefault autoRotate={false} enableZoom={false} enablePan={false} minDistance={3} maxDistance={3} />
                </Canvas>
            )}
        </div>
    );
});

ModelViewer.displayName = "ModelViewer";