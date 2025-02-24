export interface User {
  fid: number;
  username: string;
  following: number[];
}

export interface ConnectionPath {
  start: User;
  end: User;
  path: User[];
  degree: number;
}

export interface FrameState {
  step: 'initial' | 'search' | 'loading' | 'result' | 'error';
  startUser?: string;
  endUser?: string;
  error?: string;
} 