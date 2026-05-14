import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
import {
  TaskbarContainer,
  TaskbarButton,
  Window,
  DragBar,
  WindowCloseButton,
  Desktop
} from "@/components";
import { ModelViewer } from "./components/ModelViewer";
import { MultiImageSlider } from "./components/MultiImageSlider";

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: "oXYojThwEmj2X7tQQvSkpZ", // Keep your existing project ID
      token: "ozmsrT0ebHCjNl56XFIqxPaOpBITzolxxiptQCy15Jp2bIAvGLdnkHm0UMDqkKZgZ5mg6s0XIRJngtoLg", // Keep your existing project token
    },
  ],
  // Fetches the latest revisions, whether or not they were unpublished!
  // Disable for production to ensure you render only published changes.
  preview: true,
});

PLASMIC.registerComponent(TaskbarContainer, {
  name: "TaskbarContainer",
  providesData: true,
  props: {
    children: { type: "slot" },
  },
});

PLASMIC.registerComponent(TaskbarButton, {
  name: "TaskbarButton",
  providesData: true,
  props: {
    windowId: { type: "string", defaultValue: "my-window-1" },
    soloMode: {
      type: "boolean",
      defaultValue: false,
      description: "When enabled, clicking this will close all other open windows."
    },
    children: { type: "slot" },
  },
});

PLASMIC.registerComponent(Window, {
  name: "Window",
  providesData: true,
  props: {
    windowId: { type: "string", defaultValue: "my-window-1" },
    defaultOpen: { type: "boolean", defaultValue: false },
    initialPosition: {
      type: "string",
      defaultValue: "",
      description: "CSS positioning shorthand (e.g., 'right 20px bottom 0' or '80px 50%')"
    },
    initialX: {
      type: "number",
      defaultValue: 0,
      description: "Initial horizontal fallback (px)"
    },
    initialY: {
      type: "number",
      defaultValue: 0,
      description: "Initial vertical fallback (px)"
    },
    children: { type: "slot" },
  },
});

PLASMIC.registerComponent(DragBar, {
  name: "DragBar",
  providesData: true,
  props: {
    children: { type: "slot" },
  },
});

PLASMIC.registerComponent(WindowCloseButton, {
  name: "WindowCloseButton",
  providesData: true,
  props: {
    children: { type: "slot" },
  },
});

PLASMIC.registerComponent(Desktop, {
  name: "Desktop",
  providesData: true,
  props: {
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "text",
          value: "Drag your Windows here!"
        }
      ]
    },
  },
});


PLASMIC.registerComponent(ModelViewer, {
  name: "3D Model Viewer",
  description: "Renders a GLB/GLTF 3D model with rotatable controls in flat or wireframe style.",
  props: {
    modelUrl: {
      type: "string",
      defaultValue: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb",
      description: "URL link to your .glb or .gltf file",
    },
    renderMode: {
      type: "choice",
      options: ["flat", "wireframe"],
      defaultValue: "flat",
      description: "Switch between unshaded flat color and wireframe rendering",
    },
    wireframeColor: {
      type: "color",
      defaultValue: "#333333",
      description: "Wireframe line color",
      advanced: false,
    },
    flatColor: {
      type: "color",
      defaultValue: "#ffffff",
      description: "Flat-mode tint color (multiplied with the model texture/base color)",
      advanced: false,
    },
  },
});

PLASMIC.registerComponent(MultiImageSlider, {
  name: "MultiImageSlider",
  displayName: "Multi-Image Comparison Slider",
  props: {
    baseImage: {
      type: "imageUrl",
      defaultValue: "https://via.placeholder.com/800x600/FFB6C1/000000?text=Base+Image",
      displayName: "Base Image",
    },
    midImage: {
      type: "imageUrl",
      defaultValue: "https://via.placeholder.com/800x600/ADD8E6/000000?text=Middle+Image",
      displayName: "Middle Image",
    },
    finalImage: {
      type: "imageUrl",
      displayName: "Final Image (Optional 3rd)",
      description: "Adding this activates 3-Image Mode.",
    },
    mode: {
      type: "choice",
      options: ["mask", "fade"],
      defaultValue: "mask",
      description: "Mask = sweeping edge. Fade = opacity crossfade.",
    },
    snapToSteps: {
      type: "boolean",
      defaultValue: false,
      displayName: "Snap to Steps",
      description: "Forces slider to lock into distinct states rather than sliding smoothly.",
    },
    grabber: {
      type: "slot",
      hidePlaceholder: true,
    },
  },
});