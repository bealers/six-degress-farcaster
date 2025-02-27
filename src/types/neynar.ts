import { User } from './graph.js';

/**
 * Neynar user response interface
 */
export interface UserResponse {
  user: User | null;
}

/**
 * Options for configuring the NeynarService
 */
export interface NeynarServiceOptions {
  cacheTTL?: number;
  // Add any other options you might need
}

/**
 * Neynar client interface for direct API interactions
 */
export interface NeynarClient {
  getFollowers(fid: number): Promise<number[]>;
  getFollowing(fid: number): Promise<number[]>;
  getUserByUsername(username: string): Promise<User>;
  getPopularUsers(limit: number): Promise<any[]>;
} 