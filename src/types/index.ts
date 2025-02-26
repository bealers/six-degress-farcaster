/**
 * Central type definitions file for the application
 * Re-exports types from specialized files for convenience
 */

// Import and re-export User from graph.ts to maintain backward compatibility
import { User } from './graph.js';
export { User };

// Connection path type used to represent social connection paths
export interface ConnectionPath {
  degree: number;
  path: User[];
}

// Frame state for tracking user interaction state
export interface FrameState {
  step: 'initial' | 'search' | 'loading' | 'result' | 'error';
  startUser?: string;
  endUser?: string;
  error?: string;
} 