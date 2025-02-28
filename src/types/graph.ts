/**
 * User profile information from the social graph
 */
export interface User {
  username: string;
  display: string;
  fid: number;
  pfpUrl: string;
  followerCount?: number | string; // Make this optional to maintain compatibility
}

/**
 * Popular user with additional display information
 */
export interface PopularUser {
  fid: number;
  username: string;
  display: string;
  pfp: string;
  followerCount: number;
}

/**
 * Social mapping interface
 */
export interface SocialMapping {
  [fid: number]: {
    followers: number[];
    following: number[];
  };
}

/**
 * Neynar-specific client interface
 */
export interface NeynarClient {
  fetchFollowers(fid: number, cursor?: string): Promise<any>;
  fetchFollowing(fid: number, cursor?: string): Promise<any>;
  fetchUserByUsername(username: string): Promise<any>;
  fetchPopularUsers(limit?: number): Promise<any>;
}

/**
 * Common interface for social graph API providers
 * (Basically a wrapper to Neynar)
 */
export interface GraphAPI {
  /**
   * Get followers of a user
   * @param fid The FID of the user
   * @returns Array of follower FIDs
   */
  getFollowers(fid: number): Promise<number[]>;
  
  /**
   * Get users that a user is following
   * @param fid The FID of the user
   * @returns Array of following FIDs
   */
  getFollowing(fid: number): Promise<number[]>;
  
  /**
   * Look up a user by username
   * @param username The username to look up
   * @returns User information
   */
  getUserByUsername(username: string): Promise<User>;
  
  /**
   * Look up a user by FID
   * @param fid The FID to look up
   * @returns User information
   */
  getUserByFid(fid: number): Promise<User>;
  
  /**
   * Get popular users on the platform
   * @param limit Maximum number of users to return
   * @returns Array of popular users
   */
  getPopularUsers(limit?: number): Promise<PopularUser[]>;
  
  /**
   * Alias for getUserByFid for backward compatibility
   * @param fid The FID to look up
   * @returns User information
   */
  lookupUserByFid(fid: number): Promise<User>;
  
  /**
   * Get the count of mutual follows between two users
   * @param fidA First user's FID
   * @param fidB Second user's FID
   * @returns Count of mutual follows
   */
  getMutualFollowCount(fidA: number, fidB: number): Promise<number>;
  
  /**
   * Get detailed user information including follower count
   * @param fid User's FID
   * @returns Detailed user information
   */
  getUserDetailsByFid(fid: number): Promise<User>;
} 