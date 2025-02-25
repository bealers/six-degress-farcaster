export interface User {
  fid: number;
  username: string;
  displayName?: string;
  pfpUrl?: string;
}

export interface ConnectionPath {
  degree: number;
  path: User[];
}

export interface FrameState {
  step: 'initial' | 'search' | 'loading' | 'result' | 'error';
  startUser?: string;
  endUser?: string;
  error?: string;
} 