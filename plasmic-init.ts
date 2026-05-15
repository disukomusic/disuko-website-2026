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
import { WindowProvider } from "@/components/WindowSystem";
import { MusicPlayerRoot, MusicControl, MusicSeekBar } from "./components/MusicPlayer";
import {BassReactor} from "./components/BassReactor";
import { MusicWindowSync } from "./components/MusicWindowSync";
import {StartMenuButton} from "@/components/StartMenuButton";

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

PLASMIC.registerGlobalContext(WindowProvider, {
  name: "WindowSystemProvider",
  props: {
    initialGlobalMute: {
      type: "boolean",
      defaultValue: false,
      displayName: "Mute All Sounds (Default)"
    },
    defaultSoundOpen: { type: "string", displayName: "Sound: Open" },
    defaultSoundClose: { type: "string", displayName: "Sound: Close" },
    defaultSoundFocus: { type: "string", displayName: "Sound: Focus" },
    defaultSoundDragStart: { type: "string", displayName: "Sound: Drag Start" },
    defaultSoundDragEnd: { type: "string", displayName: "Sound: Drag End" },
    defaultSoundClick: { type: "string", displayName: "Sound: Button Click" },
    defaultSoundTaskbarHover: { type: "string", displayName: "Sound: Taskbar Hover" }
  }
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
    soundClick: { type: "string" },
    soundHover: { type: "string" },
    muteSounds: { type: "boolean", defaultValue: false },
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

    soundOpen: { type: "string", description: "URL to an audio file (.mp3, .wav)" },
    soundClose: { type: "string" },
    soundFocus: { type: "string" },
    soundDragStart: { type: "string" },
    soundDragEnd: { type: "string" },
    muteSounds: { type: "boolean", defaultValue: false, description: "Mute all interactions on this specific window" },
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
    soundClick: { type: "string" },
    muteSounds: { type: "boolean", defaultValue: false },
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
  // ADD THIS BLOCK:
  refActions: {
    updateModel: {
      description: "Change the 3D model URL dynamically",
      argTypes: [
        {
          name: "url",
          type: "string",
        },
      ],
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
})

PLASMIC.registerComponent(MusicPlayerRoot, {
  name: 'MusicPlayerRoot',
  displayName: 'Music Player (Root)',
  providesData: true,
  props: {
    tracks: {
      type: 'array',
      defaultValue: [
        {
          name: 'Lofi Study Beat',
          artist: 'Sample Artist',
          url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
          artwork: 'https://via.placeholder.com/300'
        }
      ],
      itemType: {
        type: 'object',
        nameFunc: (item: any) => item?.name || 'New Track',
        fields: {
          name: 'string',
          artist: 'string',
          url: 'string',
          artwork: 'imageUrl'
        }
      }
    },
    children: {
      type: 'slot',
      defaultValue: [
        {
          type: 'text',
          value: 'Add your music player UI (artwork, text, controls) inside this container.'
        }
      ]
    }
  }
});

PLASMIC.registerComponent(MusicControl, {
  name: 'MusicControl',
  displayName: 'Music Control Button',
  props: {
    action: {
      type: 'choice',
      options: ['playPause', 'play', 'pause', 'stop', 'next', 'prev', 'fastForward', 'rewind'],
      defaultValue: 'playPause'
    },
    children: {
      type: 'slot',
      defaultValue: [
        {
          type: 'text',
          value: 'Play / Pause'
        }
      ]
    }
  }
});

PLASMIC.registerComponent(MusicSeekBar, {
  name: 'Music Seek Bar',
  props: {
    className: 'string',
    trackSlot: {
      type: 'slot',
      defaultValue: {
        type: 'vbox',
        styles: { width: '100%', height: '4px', backgroundColor: '#e0e0e0', borderRadius: '2px' }
      }
    },
    fillSlot: {
      type: 'slot',
      defaultValue: {
        type: 'vbox',
        styles: { width: '100%', height: '4px', backgroundColor: '#000000', borderRadius: '2px' }
      }
    },
    thumbSlot: {
      type: 'slot',
      defaultValue: {
        type: 'vbox',
        styles: { width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#000000' }
      }
    }
  }
});

PLASMIC.registerComponent(BassReactor, {
  name: 'BassReactor',
  displayName: 'Bass Reactor',
  description: 'Makes its children bounce, shake, and rotate in reaction to the MusicPlayer\'s bass frequencies.',
  props: {
    children: {
      type: 'slot',
      defaultValue: [
        {
          type: 'text',
          value: 'Drop an image or button here to make it bounce to the bass!'
        }
      ]
    },
    sensitivity: {
      type: 'number',
      defaultValue: 1.0,
      description: 'How dramatic the shake and scale effect is.'
    },
    bassThreshold: {
      type: 'number',
      defaultValue: 0.05,
      description: 'How loud the bass needs to be to trigger a shake (range: 0 to 1).'
    },
    rotationStrength: {
      type: 'number',
      defaultValue: 10.0,
      description: 'How much the element tilts and rotates when the bass hits.'
    }
  }
});

PLASMIC.registerComponent(MusicWindowSync, {
  name: 'MusicWindowSync',
  displayName: 'Music Window Sync Bridge',
  description: 'Invisibly listens to a specific Window ID and fades out the music player when that window is minimized.',
  props: {
    windowId: {
      type: 'string',
      defaultValue: 'my-window-1',
      description: 'MUST MATCH the ID of the window containing your music player UI.',
    },
    fadeDuration: {
      type: 'number',
      defaultValue: 500,
      description: 'How long the fade-out lasts in milliseconds.',
    }
  }
});

PLASMIC.registerComponent(StartMenuButton, {
  name: 'StartMenuButton',
    displayName: 'Start Menu Button',
    description: 'A pre-styled TaskbarButton that toggles a window with the ID "start-menu".',
  props: {
    label: "string",
  }
});