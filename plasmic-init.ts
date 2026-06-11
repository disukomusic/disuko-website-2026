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
import { MusicPlayerRoot, MusicControl, MusicSeekBar } from "./components/MusicPlayer";
import {BassReactor} from "./components/BassReactor";
import { MusicWindowSync } from "./components/MusicWindowSync";
import { ImageCarousel} from "@/components/ImageCarousel";
import { ReactiveBackground} from "@/components/ReactiveBackground";
import { WindowMinimizeButton } from "@/components/WindowMinimizeButton";
import { WindowActionBridge } from "@/components/WindowActionBridge";
import { WindowConfigurator } from "@/components/WindowConfigurator";
import { BlogProvider } from './components/BlogProvider';
import { BlogAdmin } from './components/BlogAdmin';
import {UrlQueryOpener} from "@/components/UrlQueryOpener";

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
    targetWindowIds: {
      type: "string",
      defaultValue: "my-window-1",
      description: "Comma-separated IDs (e.g., 'music-main, music-desc-1')"
    },
    soloMode: {
      type: "boolean",
      defaultValue: false,
      description: "When enabled, clicking this will close all other open windows."
    },
    minimizeGroup: {
      type: "string",
      defaultValue: "",
      displayName: "Minimize Group",
      description: "Comma-separated IDs (e.g., 'overlay-*'). When clicked, these windows will be minimized instead of closed."
    },
    children: { type: "slot" },
    soundClick: { type: "string" },
    soundHover: { type: "string" },
    muteSounds: { type: "boolean", defaultValue: false },
    onCustomAction: {
      type: "eventHandler",
      argTypes: [],
      displayName: "On Custom Action",
      description: "Trigger additional actions (like Element Actions or State Updates) when clicked."
    }
  },
});

PLASMIC.registerComponent(Window, {
  name: "Window",
  providesData: true,
  props: {
    windowId: { type: "string", defaultValue: "my-window-1" },
    pageGroup: "string",
    defaultOpen: { type: "boolean", defaultValue: false },
    alwaysAtBack: {
      type: "boolean",
      defaultValue: false,
      description: "Locks the z-index so this window is always behind the others."
    },
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
    soundMinimize: { type: "string", displayName: "Sound: Minimize" },
    soundMaximize: { type: "string", displayName: "Sound: Maximize" },
    muteSounds: { type: "boolean", defaultValue: false, description: "Mute all interactions on this specific window" },

    onOpen: {
      type: "eventHandler",
      argTypes: [],
      displayName: "On Open",
      description: "Triggered when the window state changes to open."
    },
    onClose: {
      type: "eventHandler",
      argTypes: [],
      displayName: "On Close",
      description: "Triggered when the window state changes to closed."
    },
    onFocus: {
      type: "eventHandler",
      argTypes: [],
      displayName: "On Focus",
      description: "Triggered when the window is brought to the front."
    },
    onUnfocus: {
      type: "eventHandler",
      argTypes: [],
      displayName: "On Unfocus",
      description: "Triggered when the window loses focus to another window."
    },
    onMinimize: {
      type: "eventHandler",
      argTypes: [],
      displayName: "On Minimize",
      description: "Triggered when the window state changes to minimized."
    }
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
    onCustomAction: {
      type: "eventHandler",
      argTypes: [],
      displayName: "On Custom Action",
      description: "Trigger additional actions (like State Updates) when closed."
    }
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
  refProp: 'ref',
  props: {
    libraryUrl: {
      type: 'string',
      displayName: 'Cloud Library URL',
      description: 'URL to a JSON endpoint (like a Cloudflare Worker) that returns an array of tracks from your R2 bucket.',
      defaultValue: ''
    },
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
  },
  refActions: {
    SetSong: {
      description: 'Set the current song by passing a track JSON object.',
      argTypes: [
        {
          name: 'trackJson',
          type: 'object',
          displayName: 'Track JSON'
        }
      ]
    },
    SetSongByUrl: {
      description: 'Set the current song by passing its URL (Production Safe).',
      argTypes: [{ name: 'url', type: 'string', displayName: 'Track URL' }]
    },
    play: {
      description: 'Start playing the current track.',
      argTypes: []
    },
    pause: {
      description: 'Pause the current track.',
      argTypes: []
    },
    nextTrack: {
      description: 'Skip to the next track in the playlist.',
      argTypes: []
    },
    prevTrack: {
      description: 'Skip to the previous track in the playlist.',
      argTypes: []
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

PLASMIC.registerComponent(ImageCarousel, {
  name: "ImageCarousel",
  displayName: "Image Carousel",
  description: "A smooth, swipeable carousel with bouncy physics. Accepts any number of images or components.",
  providesData: true,
  props: {
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "img",
          src: "https://via.placeholder.com/800x600/FFB6C1/000000?text=Slide+1"
        },
        {
          type: "img",
          src: "https://via.placeholder.com/800x600/ADD8E6/000000?text=Slide+2"
        }
      ]
    },
    leftArrow: {
      type: "slot",
      hidePlaceholder: true,
      displayName: "Custom Left Arrow"
    },
    rightArrow: {
      type: "slot",
      hidePlaceholder: true,
      displayName: "Custom Right Arrow"
    },
    slideGap: {
      type: "number",
      defaultValue: 0,
      displayName: "Slide Gap (px)",
      description: "Spacing between each slide in pixels."
    }
  }
});

PLASMIC.registerComponent(ReactiveBackground, {
  name: 'ReactiveBackground',
  props: {
    defaultImage: {
      type: 'imageUrl',
      description: "The default displayed image."
    },
    image: {
      type: 'imageUrl',
      description: "The displayed image."
    },
    transitionType: {
      type: "choice",
      options: ["wipe", "crossfade", "glitch", "zoom", "slide"],
      defaultValue: "wipe",
      description: "The visual effect used when transitioning to a new background."
    }
  },
  refActions: {
    updateBackground: {
      description: "Trigger a transition to a new background image.",
      argTypes: [
        {
          name: "url",
          type: "imageUrl",
          displayName: "Image URL"
        }
      ]
    },
    resetBackground: {
      description: "Reset the background to its default image.",
      argTypes: []
    }
  }
});

PLASMIC.registerComponent(WindowMinimizeButton, {
  name: "WindowMinimizeButton",
  providesData: true,
  props: {
    children: { type: "slot" },
    soundClick: { type: "string" },
    muteSounds: { type: "boolean", defaultValue: false },
    onCustomAction: {
      type: "eventHandler",
      argTypes: [],
      displayName: "On Custom Action",
      description: "Trigger additional actions (like State Updates) when minimized."
    }
  },
});

PLASMIC.registerComponent(WindowActionBridge, {
  name: "WindowActionBridge",
  displayName: "Window System Actions",
  description: "An invisible bridge. Place this on your page to trigger global window actions via 'Run element action'.",
  props: {}, // No visual props needed
  refActions: {
    minimizeWindows: {
      description: "Minimize windows matching a pattern (e.g., 'content-*')",
      argTypes: [
        {
          name: "patterns",
          type: "string",
          displayName: "Target Window IDs",
        }
      ]
    },
    closeWindows: {
      description: "Close windows matching a pattern (e.g., 'content-*')",
      argTypes: [
        {
          name: "patterns",
          type: "string",
          displayName: "Target Window IDs",
        }
      ]
    },
    openWindows: {
      description: "Open windows matching a pattern (e.g., 'content-*')",
      argTypes: [
        {
          name: "patterns",
          type: "string",
          displayName: "Target Window IDs",
        }
      ]
    }
  }
});

PLASMIC.registerComponent(WindowConfigurator, {
  name: "Window Configurator",
  displayName: "Window Audio Config",
  props: {
    initialGlobalMute: {
      type: "boolean",
      defaultValue: false,
      displayName: "Mute All Sounds"
    },
    defaultSoundOpen: { type: "string", displayName: "Sound: Open" },
    defaultSoundClose: { type: "string", displayName: "Sound: Close" },
    defaultSoundFocus: { type: "string", displayName: "Sound: Focus" },
    defaultSoundDragStart: { type: "string", displayName: "Sound: Drag Start" },
    defaultSoundDragEnd: { type: "string", displayName: "Sound: Drag End" },
    defaultSoundClick: { type: "string", displayName: "Sound: Button Click" },
    defaultSoundTaskbarHover: { type: "string", displayName: "Sound: Taskbar Hover" }
    ,defaultSoundMinimize: { type: "string", displayName: "Sound: Minimize" },
    defaultSoundMaximize: { type: "string", displayName: "Sound: Maximize" }
  }
});

PLASMIC.registerComponent(BlogProvider, {
  name: 'BlogProvider',
  providesData: true,
  props: {
    apiEndpoint: {
      type: 'string',
      defaultValue: 'https://plasmic-blog-api.disukomusic.workers.dev',
      description: 'The URL of your Cloudflare Worker endpoint'
    },
    children: {
      type: 'slot'
    }
  }
});

PLASMIC.registerComponent(BlogAdmin, {
  name: 'BlogAdmin',
  props: {
    apiEndpoint: {
      type: 'string',
      defaultValue: 'https://plasmic-blog-api.disukomusic.workers.dev',
      description: 'The URL of your Cloudflare Worker endpoint'
    },
    formClassName: { type: "class", displayName: "Form Class" },
    inputClassName: { type: "class", displayName: "Input Class" },
    buttonClassName: { type: "class", displayName: "Button Class" },
    titleClassName: { type: "class", displayName: "Title Class" },
    messageClassName: { type: "class", displayName: "Message Class" }
  }
});

PLASMIC.registerComponent(UrlQueryOpener, {
  name: "UrlQueryOpener",
  displayName: "URL Query Opener",
  props: {
    className: "string",
  },
  description: "Reads the ?group= query parameter on load and automatically opens matching window groups while closing others.",
});