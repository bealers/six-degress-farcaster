import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';
import { User as NeynarUser, HydratedFollower } from '@neynar/nodejs-sdk/build/api';
import { config } from '../config.js';
import { GraphAPI, PopularUser, User } from '../types/graph.js';
import { NeynarServiceOptions } from '../types/neynar.js';

/**
 * Implementation of GraphAPI interface using Neynar service
 */
export class NeynarService implements GraphAPI {
  
  private client: NeynarAPIClient;
  private popularUsersCache: PopularUser[] = [];  
  private lastCacheUpdate: number = Date.now(); 
    
  private readonly CACHE_MINUTES: number = 30; 
  private readonly CACHE_TTL: number;
  
  // Keep track of instance creation to identify if new instances are being created
  private static instanceCount = 0;
  private instanceId: number;
  
  private cache: Map<string, { data: any, expiry: number }> = new Map();
  private cacheTTL: number; // Cache TTL in milliseconds
  
  constructor(apiKey: string, options?: NeynarServiceOptions) {
    // Track instance creation
    NeynarService.instanceCount++;
    this.instanceId = NeynarService.instanceCount;
    console.log(`[NEYNAR] Creating NeynarService instance #${this.instanceId}`);
    
    const configuration = new Configuration({
      apiKey: apiKey,
    });
    this.client = new NeynarAPIClient(configuration);
    
    // Calculate TTL from minutes setting
    this.CACHE_TTL = this.CACHE_MINUTES * 60 * 1000;
    console.log(`[NEYNAR] Cache TTL set to ${this.CACHE_TTL}ms (${this.CACHE_MINUTES} minutes)`);
    
    // Initialize with empty array instead of referencing undefined constant
    this.popularUsersCache = [];
    
    // Fetch popular users on initialization
    this.fetchPopularUsers().catch(err => {
      console.error('[NEYNAR] Failed to fetch initial popular users:', err);
    });
    
    // Initialize cache TTL
    this.cacheTTL = this.CACHE_TTL;
  }

  /**
   * Save data to the in-memory cache
   * @param key Cache key
   * @param data Data to cache
   * @param ttlSeconds TTL in seconds (defaults to class TTL)
   */
  private saveToCache(key: string, data: any, ttlSeconds?: number): void {
    const ttlMs = (ttlSeconds || this.cacheTTL / 1000) * 1000;
    const expiry = Date.now() + ttlMs;
    this.cache.set(key, { data, expiry });
  }
  
  /**
   * Get data from the in-memory cache
   * @param key Cache key
   * @returns Cached data or null if not found/expired
   */
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    
    // Return null if not in cache or expired
    if (!cached || Date.now() > cached.expiry) {
      if (cached) {
        // Clean up expired cache entry
        this.cache.delete(key);
      }
      return null;
    }
    
    return cached.data;
  }

  async getFollowers(fid: number): Promise<number[]> {
    console.log(`Looking up followers for FID: ${fid}`);
    try {
      const response = await this.client.fetchUserFollowers({ fid });
      console.log(`Found ${response.users.length} followers`);
      
      // DEBUG: Log the structure of the first follower object if available
      if (response.users.length > 0) {
        console.log(`[DEBUG] First follower object structure: ${JSON.stringify(response.users[0])}`);
      }
      
      // Extract FIDs from the correct path in the response
      let followerFids: number[] = [];
      
      for (const obj of response.users) {
        if (typeof obj === 'object' && obj !== null) {
          // Check for the actual structure returned by the API: { object: "follow", user: { fid: number, ... } }
          if (obj.user && typeof obj.user === 'object' && 'fid' in obj.user) {
            followerFids.push(Number(obj.user.fid));
          } else if ('fid' in obj) {
            // Direct fid property (fallback)
            followerFids.push(Number(obj.fid));
          } else if ('follower' in obj && typeof obj.follower === 'object' && obj.follower && 'fid' in obj.follower) {
            // Nested follower object with fid (fallback)
            followerFids.push(Number(obj.follower.fid));
          }
        }
      }
      
      console.log(`[DEBUG] Extracted ${followerFids.length} follower FIDs: ${JSON.stringify(followerFids.slice(0, 5))}...`);
      return followerFids.filter(fid => fid > 0);
    } catch (error) {
      console.error(`Error fetching followers for FID ${fid}:`, error);
      return []; // Return empty array on error
    }
  }

  async getFollowing(fid: number): Promise<number[]> {
    console.log(`Looking up following for FID: ${fid}`);
    try {
      const response = await this.client.fetchUserFollowing({ fid });
      console.log(`Found ${response.users.length} following`);
      
      // DEBUG: Log the structure of the first following object if available
      if (response.users.length > 0) {
        console.log(`[DEBUG] First following object structure: ${JSON.stringify(response.users[0])}`);
      }
      
      // Extract FIDs from the correct path in the response
      let followingFids: number[] = [];
      
      for (const obj of response.users) {
        if (typeof obj === 'object' && obj !== null) {
          // Check for the actual structure returned by the API: { object: "follow", user: { fid: number, ... } }
          if (obj.user && typeof obj.user === 'object' && 'fid' in obj.user) {
            followingFids.push(Number(obj.user.fid));
          } else if ('fid' in obj) {
            // Direct fid property (fallback)
            followingFids.push(Number(obj.fid));
          } else if ('following' in obj && typeof obj.following === 'object' && obj.following && 'fid' in obj.following) {
            // Nested following object with fid (fallback)
            followingFids.push(Number(obj.following.fid));
          }
        }
      }
      
      console.log(`[DEBUG] Extracted ${followingFids.length} following FIDs: ${JSON.stringify(followingFids.slice(0, 5))}...`);
      return followingFids.filter(fid => fid > 0);
    } catch (error) {
      console.error(`Error fetching following for FID ${fid}:`, error);
      return []; // Return empty array on error
    }
  }

  /**
   * Get a user by their FID
   * @param fid The Farcaster ID to look up
   * @returns Promise resolving to a User object
   */
  async getUserByFid(fid: number): Promise<User> {
    try {
      console.log(`[NEYNAR] Looking up user by FID: ${fid}`);
      
      const response = await this.client.fetchBulkUsers({ fids: [fid] });
      if (!response.users?.[0]) {
        throw new Error(`User with FID ${fid} not found`);
      }
      return this.adaptUser(response.users[0]);
    } catch (error) {
      console.error(`[NEYNAR] Error fetching user by FID ${fid}:`, error);
      throw new Error(`User with FID ${fid} not found`);
    }
  }

  /**
   * Get a user by their username
   * @param username The username to look up (with or without @)
   * @returns Promise resolving to a User object
   */
  async getUserByUsername(username: string): Promise<User> {
    // Remove @ if present
    const clean = username.startsWith('@') ? username.substring(1) : username;
    
    try {
      console.log(`[NEYNAR] Looking up user by username: ${clean}`);
      // Use the correct client method for username lookup
      const response = await this.client.lookupUserByUsername({ username: clean });
      if (!response.user) {
        throw new Error(`User @${clean} not found`);
      }
      return this.adaptUser(response.user);
    } catch (error) {
      console.error(`[NEYNAR] Error fetching user by username ${clean}:`, error);
      throw new Error(`User @${clean} not found`);
    }
  }

  /**
   * Get popular users based on follower count or trending activity
   * Uses a local cache with TTL to reduce API calls
   * @param limit Number of users to return (default: 20)
   * @returns Array of popular users with their profile information
   */
  async getPopularUsers(limit: number = 20): Promise<PopularUser[]> {
    console.log(`[NEYNAR] Fetching popular users from API, limit: ${limit}`);
    try {
      // Get the users via the fetchPopularUsers method
      const users = await this.fetchPopularUsers(limit);
      
      // Convert to PopularUser type - fixing the pfp property mapping
      return users.map(user => ({
        fid: user.fid,
        username: user.username,
        display: user.display,
        pfp: user.pfpUrl,
        followerCount: 0 
      }));
    } catch (error) {
      console.error(`[NEYNAR] Error fetching popular users:`, error);
      return [];
    }
  }
  
  /**
   * Helper method to fetch active casters
   * This would be implemented with the proper API call when available
   * @returns Array of popular users based on recent activity
   */
  private async fetchActiveCasters(): Promise<PopularUser[]> {
    // This is placeholder for future implementation
    // when a trending/active users API is available
    return [];
  }

  /**
   * Fetches popular users from Neynar API
   * @param limit Number of users to fetch
   * @returns Promise resolving to array of popular users
   */
  async fetchPopularUsers(limit: number = 20): Promise<User[]> {
    try {
      // Use the Neynar API to fetch popular/power users
      console.log(`[NEYNAR #${this.instanceId}] Fetching power users from API`);
      const response = await this.client.fetchPowerUsers({ limit });
      
      // Extract users from the response and adapt them
      const users = response.users
        .slice(0, limit)
        .map(user => this.adaptUser(user));
      
      console.log(`[NEYNAR #${this.instanceId}] Extracted ${users.length} unique users from power users`);
      
      return users;
    } catch (error) {
      console.error(`[NEYNAR #${this.instanceId}] Error fetching power users:`, error);
      return []; // Return empty array on error
    }
  }

  async lookupUserByFid(fid: number): Promise<User> {
    return this.getUserByFid(fid);
  }

  /**
   * Adapts a Neynar user to our application's User interface
   */
  private adaptUser(neynarUser: any): User {
    return {
      username: neynarUser.username,
      display: neynarUser.display_name || neynarUser.username,
      fid: neynarUser.fid,
      pfpUrl: neynarUser.pfp_url || `https://warpcast.com/~/avatar/${neynarUser.fid}`
    };
  }

  /**
   * Get mutual follow count between two users
   */
  async getMutualFollowCount(fidA: number, fidB: number): Promise<number> {
    try {
      // Get followers and following for both users
      const [followersA, followingA] = await Promise.all([
        this.getFollowers(fidA),
        this.getFollowing(fidA)
      ]);
      
      const [followersB, followingB] = await Promise.all([
        this.getFollowers(fidB),
        this.getFollowing(fidB)
      ]);
      
      // Convert to FID sets for efficient comparison
      const followersASet = new Set(followersA);
      const followingASet = new Set(followingA);
      const followersBSet = new Set(followersB);
      const followingBSet = new Set(followingB);
      
      // Calculate mutual follows (A follows B AND B follows A)
      let mutualCount = 0;
      
      // A follows B directly
      if (followingASet.has(fidB)) mutualCount++;
      
      // B follows A directly
      if (followingBSet.has(fidA)) mutualCount++;
      
      // Count mutual followers (people who follow both A and B)
      const mutualFollowers = [...followersASet].filter(fid => followersBSet.has(fid));
      
      // Count mutual following (people who both A and B follow)
      const mutualFollowing = [...followingASet].filter(fid => followingBSet.has(fid));
      
      return mutualFollowers.length + mutualFollowing.length + mutualCount;
    } catch (error) {
      console.error(`Error getting mutual follow count: ${error}`);
      return 0;
    }
  }

  /**
   * Get detailed user information including follower count
   * @param fid User's FID
   * @returns Detailed user information
   */
  async getUserDetailsByFid(fid: number): Promise<User> {
    try {
      // Get the basic user information first
      const user = await this.getUserByFid(fid);
      
      // If we already have follower count, return the user
      if (user.followerCount) {
        return user;
      }
      
      // Try to get from cache
      let cachedUser = null;
      try {
        const cachedKey = `user_details_${fid}`;
        cachedUser = this.getFromCache(cachedKey);
      } catch (cacheError) {
        console.warn(`[NEYNAR] Cache error (continuing without cache): ${cacheError}`);
      }
      
      if (cachedUser) {
        return cachedUser;
      }
      
      // Otherwise, fetch the detailed user info from Neynar
      console.log(`[NEYNAR] Fetching detailed user info for FID: ${fid}`);
      try {
        const response = await this.client.fetchBulkUsers({ fids: [fid] });
        const userData = response.users?.[0];
        
        if (!userData) {
          throw new Error(`User with FID ${fid} not found`);
        }
        
        // Extract the follower count from the response
        const followerCount = userData.follower_count || 0;
        
        // Enhance the user object with follower count
        const enhancedUser = {
          ...user,
          followerCount
        };
        
        // Try to save to cache
        try {
          const cachedKey = `user_details_${fid}`;
          this.saveToCache(cachedKey, enhancedUser, 60 * 60); // Cache for 1 hour
        } catch (cacheError) {
          console.warn(`[NEYNAR] Cache save error: ${cacheError}`);
        }
        
        return enhancedUser;
      } catch (error) {
        console.error(`[NEYNAR] Error fetching user data:`, error);
        throw new Error(`Failed to fetch user data for FID ${fid}`);
      }
    } catch (error) {
      console.error(`[NEYNAR] Error in getUserDetailsByFid for FID ${fid}:`, error);
      throw error;
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    console.log('[NEYNAR] Clearing cache');
    this.cache.clear();
    this.popularUsersCache = [];
    this.lastCacheUpdate = 0;
  }
} 