export interface FrameButton {
  label: string;
  action?: string;
}

export interface FrameMetadata {
  version: string;
  imageUrl: string;
  input?: {
    text: string;
  };
  buttons?: FrameButton[];
  postUrl?: string;
  state?: Record<string, unknown>;
  button?: {
    title: string;
    action: {
      type: string;
      name?: string;
      url: string;
      splashImageUrl?: string;
      splashBackgroundColor?: string;
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