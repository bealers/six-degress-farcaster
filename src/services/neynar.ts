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

  async getUserByUsername(username: string): Promise<User> {
    console.log(`Looking up user by username: ${username}`);
    const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
    try {
      const response = await this.client.lookupUserByUsername({ username: cleanUsername });
      if (!response.user) {
        throw new Error(`User not found: ${username}`);
      }
      return this.adaptUser(response.user);
    } catch (error) {
      console.error(`Error fetching user by username ${username}:`, error);
      throw new Error(`User not found: ${username}`);
    }
  }

  async getUserByFid(fid: number): Promise<User> {
    console.log(`Looking up user by FID: ${fid}`);
    try {
      const response = await this.client.fetchBulkUsers({ fids: [fid] });
      if (!response.users?.[0]) {
        throw new Error(`User not found for FID: ${fid}`);
      }
      return this.adaptUser(response.users[0]);
    } catch (error) {
      console.error(`Error fetching user by FID ${fid}:`, error);
      throw new Error(`User not found for FID: ${fid}`);
    }
  }

  /**
   * Get popular users based on follower count or trending activity
   * Uses a local cache with TTL to reduce API calls
   * @param limit Number of users to return (default: 20)
   * @returns Array of popular users with their profile information
   */
  async getPopularUsers(limit: number = 20): Promise<PopularUser[]> {
    const now = Date.now();
    const cacheAge = now - this.lastCacheUpdate;
    const cacheValid = cacheAge < this.CACHE_TTL;
    const cacheHasData = this.popularUsersCache.length > 0;
    
    console.log(`[NEYNAR #${this.instanceId}] Cache status: age=${Math.round(cacheAge/1000)}s, valid=${cacheValid}, hasData=${cacheHasData}, items=${this.popularUsersCache.length}`);
    
    // If cache is still valid, return from cache
    if (cacheValid && cacheHasData) {
      console.log(`[CACHE HIT #${this.instanceId}] Using cached popular users (age: ${Math.round(cacheAge/1000)}s, TTL: ${this.CACHE_MINUTES} minutes)`);
      return this.popularUsersCache.slice(0, limit);
    }
    
    // Log detailed cache miss reason
    const missReason = !cacheValid ? 'cache expired' : 'cache empty';
    console.log(`[CACHE MISS #${this.instanceId}] Reason: ${missReason}. Fetching ${limit} popular users from Neynar`);
    
    try {
      // Fetch popular users using our fetchPopularUsers method
      const users = await this.fetchPopularUsers(limit);
      
      if (users.length > 0) {
        // Users are already adapted by fetchPopularUsers, so we can use them directly
        const popularUsers = users.map(user => ({
          username: user.username,
          display: user.display,
          fid: user.fid,
          pfpUrl: user.pfpUrl
        }));
        
        // Deduplicate by FID
        const uniqueUsers = Array.from(
          popularUsers.reduce((map, user) => map.set(user.fid, user), new Map())
        ).map(([_, user]) => user);
        
        this.popularUsersCache = uniqueUsers;
        this.lastCacheUpdate = now;
        console.log(`[CACHE UPDATE #${this.instanceId}] Cache updated with ${uniqueUsers.length} users at: ${new Date(this.lastCacheUpdate).toISOString()}`);
        
        return uniqueUsers.slice(0, limit);
      }
      
      // If we couldn't get any users, return empty array
      console.log(`[NEYNAR #${this.instanceId}] No users returned from API call`);
      this.lastCacheUpdate = now; // Still update timestamp to prevent frequent retries
      return [];
    } catch (error) {
      console.error(`[NEYNAR #${this.instanceId}] Error fetching popular users:`, error);
      return this.popularUsersCache.slice(0, limit); // Return current cache even if empty
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
      // Use the Neynar API to fetch trending users
      console.log(`[NEYNAR #${this.instanceId}] Fetching trending users from API`);
      const response = await this.client.fetchTrendingFeed({ limit }); // Changed from fetchTrendingUsers to fetchTrendingFeed
      
      // Extract users from the feed
      const users = response.casts
        .filter(cast => cast.author)
        .map(cast => this.adaptUser(cast.author));
      
      console.log(`[NEYNAR #${this.instanceId}] Extracted ${users.length} unique users from trending feed`);
      
      return users;
    } catch (error) {
      console.error(`[NEYNAR #${this.instanceId}] Error fetching trending users:`, error);
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
} 