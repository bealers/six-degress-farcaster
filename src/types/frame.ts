export interface FrameButton {
  label: string;
  action?: string; // "post" | "link" etc.
}

export interface FrameMetadata {
  version: "next";
  imageUrl: string;
  input?: {
    text: string;
  };
  buttons?: FrameButton[];
  postUrl?: string;
  state?: Record<string, unknown>;
  button?: {
    title: string; // Button text (32 char max)
    action: {
      type: "launch_frame"; // must be this for in-feed frames
      name?: string; // App name (32 char max)
      url: string; // Frame launch URL
      splashImageUrl?: string; // 200x200px splash image
      splashBackgroundColor?: string; // Hex color code
    };
  };
}

export interface FrameOptions {
  title: string;
  description?: string;
  imageUrl: string;
  frameMetadata: FrameMetadata;
  content: string;
  includeFrameSDK?: boolean;
} 