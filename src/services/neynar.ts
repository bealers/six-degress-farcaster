import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';
import { User, HydratedFollower } from '@neynar/nodejs-sdk/build/api';
import { config } from '../config.js';
import { SocialGraphAPI, PopularUser } from './api-interface.js';

interface Follower {
  fid: number;
}

interface Following {
  fid: number;
}

interface UserResponse {
  user: User | null;
}

// Used as a last resort when API calls fail
const FALLBACK_POPULAR_USERS: PopularUser[] = [
  { username: 'vitalik.eth', display: 'Vitalik Buterin', fid: 5650, pfpUrl: 'https://warpcast.com/~/avatar/5650' },
  { username: 'dwr.eth', display: 'Dan Romero', fid: 3, pfpUrl: 'https://warpcast.com/~/avatar/3' },
  { username: 'varunsrin.eth', display: 'Varun Srinivasan', fid: 2, pfpUrl: 'https://warpcast.com/~/avatar/2' },
  { username: 'naval', display: 'Naval Ravikant', fid: 174, pfpUrl: 'https://warpcast.com/~/avatar/174' },
  { username: 'vitor', display: 'Vitor Menezes', fid: 26406, pfpUrl: 'https://warpcast.com/~/avatar/26406' },
  { username: 'puja', display: 'Puja Ohlhaver', fid: 1337, pfpUrl: 'https://warpcast.com/~/avatar/1337' },
  { username: 'balajis', display: 'Balaji S', fid: 602, pfpUrl: 'https://warpcast.com/~/avatar/602' }, 
  { username: 'davidhoffman', display: 'David Hoffman', fid: 6809, pfpUrl: 'https://warpcast.com/~/avatar/6809' }
];

export interface NeynarClient {
  getFollowers(fid: number): Promise<number[]>;
  getFollowing(fid: number): Promise<number[]>;
  getUserByUsername(username: string): Promise<User>;
  getPopularUsers(limit: number): Promise<any[]>;
}

/**
 * Implementation of SocialGraphAPI using Neynar
 */
export class NeynarService implements SocialGraphAPI {
  private client: NeynarAPIClient;
  private popularUsersCache: PopularUser[] = [];
  // Set an initial cache update time to avoid immediate misses
  private lastCacheUpdate: number = Date.now(); 
  // Change this value to adjust cache duration (in minutes)
  private readonly CACHE_MINUTES: number = 30; 
  private readonly CACHE_TTL: number;
  
  // Keep track of instance creation to identify if new instances are being created
  private static instanceCount = 0;
  private instanceId: number;
  
  constructor() {
    // Track instance creation
    NeynarService.instanceCount++;
    this.instanceId = NeynarService.instanceCount;
    console.log(`[NEYNAR] Creating NeynarService instance #${this.instanceId}`);
    
    const configuration = new Configuration({
      apiKey: config.neynar.apiKey,
    });
    this.client = new NeynarAPIClient(configuration);
    
    // Calculate TTL from minutes setting
    this.CACHE_TTL = this.CACHE_MINUTES * 60 * 1000;
    console.log(`[NEYNAR] Cache TTL set to ${this.CACHE_TTL}ms (${this.CACHE_MINUTES} minutes)`);
    
    // Initialize cache with fallback data
    this.popularUsersCache = [...FALLBACK_POPULAR_USERS];
    console.log(`[NEYNAR] Cache initialized with ${this.popularUsersCache.length} fallback users`);
    console.log(`[NEYNAR] Initial lastCacheUpdate timestamp: ${this.lastCacheUpdate}`);
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
      return response.user;
    } catch (error) {
      console.error(`Error fetching user by username ${username}:`, error);
      throw new Error(`User not found: ${username}`);
    }
  }

  async lookupUserByFid(fid: number): Promise<User> {
    console.log(`Looking up user by FID: ${fid}`);
    try {
      const response = await this.client.fetchBulkUsers({ fids: [fid] });
      if (!response.users?.[0]) {
        throw new Error(`User not found for FID: ${fid}`);
      }
      return response.users[0];
    } catch (error) {
      console.error(`Error fetching user by FID ${fid}:`, error);
      throw new Error(`User not found for FID: ${fid}`);
    }
  }

  /**
   * Get popular users based on follower count or trending activity
   * Uses a local cache with TTL to reduce API calls
   * @param limit Number of users to return (default: 10)
   * @returns Array of popular users with their profile information
   */
  async getPopularUsers(limit: number = 10): Promise<PopularUser[]> {
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
      // Try to get users with high engagement from multiple sources
      let popularUsers: PopularUser[] = [];
      
      // Method 1: Get verified users with high follower counts
      try {
        // Use the FIDs from our fallback list instead of duplicating them
        const popularFids = FALLBACK_POPULAR_USERS.map(user => user.fid);
        
        console.log(`[NEYNAR #${this.instanceId}] Fetching ${popularFids.length} popular users by FID`);
        const verifiedUsers = await this.client.fetchBulkUsers({ 
          fids: popularFids
        });
        
        if (verifiedUsers && verifiedUsers.users && verifiedUsers.users.length > 0) {
          console.log(`[NEYNAR #${this.instanceId}] Received ${verifiedUsers.users.length} users from API`);
          const users = verifiedUsers.users.map(user => ({
            username: user.username,
            display: user.display_name || user.username,
            fid: user.fid,
            pfpUrl: user.pfp_url || `https://warpcast.com/~/avatar/${user.fid}`
          }));
          
          popularUsers = [...popularUsers, ...users];
        } else {
          console.log(`[NEYNAR #${this.instanceId}] No users returned from API call`);
        }
      } catch (error) {
        console.error(`[NEYNAR #${this.instanceId}] Error fetching verified users:`, error);
      }
      
      // Method 2: Try to get active users
      // Note: fetchTrendingCasts doesn't exist in the current SDK
      
      /*
      try {
        const trendingUsers = await this.fetchActiveCasters();
        if (trendingUsers.length > 0) {
          popularUsers = [...popularUsers, ...trendingUsers];
        }
      } catch (error) {
        console.error('Error fetching trending users:', error);
      }
      */
      
      // If we have users, update cache
      if (popularUsers.length > 0) {
        // Deduplicate by FID
        const uniqueUsers = Array.from(
          popularUsers.reduce((map, user) => map.set(user.fid, user), new Map())
        ).map(([_, user]) => user);
        
        this.popularUsersCache = uniqueUsers;
        this.lastCacheUpdate = now;
        console.log(`[CACHE UPDATE #${this.instanceId}] Cache updated with ${uniqueUsers.length} users, new timestamp: ${this.lastCacheUpdate}`);
        
        return uniqueUsers.slice(0, limit);
      }
      
      // If we couldn't get any users via API, use fallback
      console.log(`[FALLBACK #${this.instanceId}] Using predefined popular users list`);
      // Still update the timestamp to prevent frequent retries
      this.lastCacheUpdate = now; 
      console.log(`[CACHE UPDATE #${this.instanceId}] Cache timestamp updated to: ${this.lastCacheUpdate}`);
      return FALLBACK_POPULAR_USERS.slice(0, limit);
    } catch (error) {
      console.error(`[NEYNAR #${this.instanceId}] Error fetching popular users:`, error);
      return FALLBACK_POPULAR_USERS.slice(0, limit);
    }
  }
  
  /**
   * Helper method to fetch active casters
   * This would be implemented with the proper API call when available
   * @returns Array of popular users based on recent activity
   */
  private async fetchActiveCasters(): Promise<PopularUser[]> {
    // This is placeholder for future implementation
    // when a proper trending/active users API is available
    return [];
  }
} 