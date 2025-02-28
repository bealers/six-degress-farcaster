import { NeynarAPIClient } from '@neynar/nodejs-sdk';
import { GraphAPI, PopularUser, SocialMapping, User } from '../types/graph.js';
import { config } from '../config.js';

/**
 * Service for user-related operations
 */
export class UserService {

  private neynarService: GraphAPI;
  
  constructor(neynarService: GraphAPI) {
    this.neynarService = neynarService;
  }
  
  /**
   * Get a user by their FID
   * @param fid The FID to lookup
   * @returns Promise resolving to a User object
   */
  async getUserByFid(fid: number): Promise<User> {
    return await this.neynarService.getUserByFid(fid);
  }
  
  /**
   * Get an array of popular Farcaster users
   * Already cached at the NeynarService level
   * @param limit Max number of users to return
   * @returns Array of popular users
   */
  async getPopularPeople(limit = 20): Promise<PopularUser[]> {
    try {
      console.log(`[USER SERVICE] Fetching popular users (limit: ${limit})`);
      // The NeynarService now handles caching internally
      const users = await this.neynarService.getPopularUsers(limit);
      console.log(`[USER SERVICE] Retrieved ${users.length} popular users`);
      return users;
    } catch (error) {
      console.error('[USER SERVICE] Error getting popular users:', error);
      return [];
    }
  }
  
  /**
   * Get a randomly selected subset of popular users, with option to exclude current user
   * @param limit Max number of users to return (defaults to config value)
   * @param currentUserFid Optional FID of current user to exclude
   * @returns Array of randomly selected popular users
   */
  async getPopularUserSelection(limit = config.users.displayUsersCount, currentUserFid?: number): Promise<PopularUser[]> {
    try {
      console.log(`[USER SERVICE] Getting selection of ${limit} popular users${currentUserFid ? ` (excluding FID ${currentUserFid})` : ''}`);
      
      // Get more users than needed to allow for filtering and selection
      const fetchLimit = Math.max(limit * 4, config.users.popularUsersLimit);
      console.log(`[USER SERVICE] Fetching ${fetchLimit} users from pool to select from`);
      
      // Get popular users from service (already cached)
      const popularUsers = await this.getPopularPeople(fetchLimit);
      
      // Filter out current user if specified (do it once, at the service level)
      let filteredUsers = popularUsers;
      
      if (currentUserFid) {
        console.log(`[USER SERVICE] Filtering out current user FID ${currentUserFid}`);
        filteredUsers = popularUsers.filter(user => user.fid !== currentUserFid);
        console.log(`[USER SERVICE] ${popularUsers.length - filteredUsers.length} users filtered out`);
      }
      
      // If we don't have enough users after filtering, just return what we have
      if (filteredUsers.length <= limit) {
        console.log(`[USER SERVICE] Not enough users to shuffle, returning all ${filteredUsers.length} available`);
        return filteredUsers;
      }
      
      // Shuffle the array to get random selection
      // Fisher-Yates shuffle algorithm
      const shuffled = [...filteredUsers];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      // Take only the number requested
      const selectedUsers = shuffled.slice(0, limit);
      console.log(`[USER SERVICE] Returning ${selectedUsers.length} randomly selected users`);
      
      // Log the selected users for debugging
      const selectedFids = selectedUsers.map(u => u.fid).join(', ');
      console.log(`[USER SERVICE] Selected user FIDs: ${selectedFids}`);
      
      return selectedUsers;
    } catch (error) {
      console.error('[USER SERVICE] Error getting popular user selection:', error);
      return [];
    }
  }
  
  /**
   * Get the followers of a user by their FID
   * @param fid The user's FID
   * @returns Array of follower FIDs
   */
  async getFollowers(fid: number): Promise<number[]> {
    try {
      return await this.neynarService.getFollowers(fid);
    } catch (error) {
      console.error(`[USER SERVICE] Error getting followers for ${fid}:`, error);
      return [];
    }
  }
  
  /**
   * Get users that the given user follows
   * @param fid The user's FID
   * @returns Array of following FIDs
   */
  async getFollowing(fid: number): Promise<number[]> {
    try {
      return await this.neynarService.getFollowing(fid);
    } catch (error) {
      console.error(`[USER SERVICE] Error getting following for ${fid}:`, error);
      return [];
    }
  }
  
  /**
   * Get a mapping of user FIDs to their followers/following
   * @param fids Array of FIDs to map
   * @returns A mapping of user relationships
   */
  async getSocialMapping(fids: number[]): Promise<SocialMapping> {
    const mapping: SocialMapping = {};

    try {
      // Process FIDs in parallel for efficiency
      await Promise.all(fids.map(async (fid) => {
        const [followers, following] = await Promise.all([
          this.getFollowers(fid),
          this.getFollowing(fid)
        ]);

        mapping[fid] = { followers, following };
      }));

      return mapping;
    } catch (error) {
      console.error('[USER SERVICE] Error building social mapping:', error);
      return mapping;
    }
  }

  /**
   * Extract the current user's FID from the Farcaster frame context
   * @param c Hono context containing the request
   * @returns The user's FID or null if not available
   */
  getCurrentUserFid(c: any): number | null {
    let currentUserFid: number | null = null;
    
    try {
      // Extract FID from Farcaster frame headers if available
      const fcData = c.req.header('fc-data');
      if (fcData) {
        try {
          const data = JSON.parse(Buffer.from(fcData, 'base64').toString());
          currentUserFid = data.fid ? Number(data.fid) : null;
          console.log(`[API] Current user FID from frame: ${currentUserFid}`);
        } catch (err) {
          console.error(`[API] Error parsing fc-data header:`, err);
        }
      }
      
      // If no FID found in headers and we're in development, use fallback FID
      if (!currentUserFid && config.isDev) {
        currentUserFid = config.development.fallbackFid;
        console.log(`[API] Development mode - no FID in headers, using fallback FID: ${currentUserFid}`);
      }
    } catch (error) {
      console.error(`[API] Error extracting user FID:`, error);
    }
    
    return currentUserFid;
  }

  /**
   * Get a user by their username
   * @param username The username to lookup (with or without @)
   * @returns Promise resolving to a User object
   */
  async getUserByUsername(username: string): Promise<User> {
    return await this.neynarService.getUserByUsername(username);
  }
} 