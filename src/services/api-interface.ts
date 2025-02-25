/**
 * User profile information from the social graph
 */
export interface User {
  username: string;
  display_name?: string;
  fid: number;
  pfp_url?: string;
}

/**
 * Popular user with additional display information
 */
export interface PopularUser {
  username: string;
  display: string;
  fid: number;
  pfpUrl: string;
}

/**
 * Common interface for social graph API providers
 * This abstraction allows for swapping Neynar with other implementations
 */
export interface SocialGraphAPI {
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
  lookupUserByFid(fid: number): Promise<User>;
  
  /**
   * Get popular users on the platform
   * @param limit Maximum number of users to return
   * @returns Array of popular users
   */
  getPopularUsers(limit?: number): Promise<PopularUser[]>;
} 