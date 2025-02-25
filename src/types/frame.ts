export interface FrameButton {
  label: string;
  action?: string; // "post" | "link" etc.
}

export interface FrameMetadata {
  version: "next"; // CRITICAL: Must be "next", NOT "vNext"
  imageUrl: string; // Must be 3:2 aspect ratio and < 10MB  
  input?: {
    text: string;
  };
  buttons?: FrameButton[];
  postUrl?: string;
  state?: Record<string, unknown>;
  button?: {
    title: string; // Button text (32 char max)
    action: {
      type: "launch_frame"; // MUST be this exact value for in-feed frames
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
  imageUrl: string; // Must be 3:2 aspect ratio and < 10MB
  frameMetadata: FrameMetadata;
  content: string;
  includeFrameSDK?: boolean;
} 