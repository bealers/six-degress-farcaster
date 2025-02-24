import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';
import { User, HydratedFollower } from '@neynar/nodejs-sdk/build/api';
import { config } from '../config.js';

interface Follower {
  fid: number;
}

interface Following {
  fid: number;
}

interface UserResponse {
  user: User | null;
}

export interface NeynarClient {
  getFollowers(fid: number): Promise<number[]>;
  getFollowing(fid: number): Promise<number[]>;
  getUserByUsername(username: string): Promise<User>;
}

export class NeynarService implements NeynarClient {
  private client: NeynarAPIClient;
  
  constructor() {
    const configuration = new Configuration({
      apiKey: config.neynar.apiKey,
    });
    this.client = new NeynarAPIClient(configuration);
  }

  async getFollowers(fid: number): Promise<number[]> {
    console.log(`Looking up followers for FID: ${fid}`);
    const response = await this.client.fetchUserFollowers({ fid });
    console.log(`Found ${response.users.length} followers`);
    return response.users.map((user: HydratedFollower) => user.fid);
  }

  async getFollowing(fid: number): Promise<number[]> {
    console.log(`Looking up following for FID: ${fid}`);
    const response = await this.client.fetchUserFollowing({ fid });
    console.log(`Found ${response.users.length} following`);
    return response.users.map((user: HydratedFollower) => user.fid);
  }

  async getUserByUsername(username: string): Promise<User> {
    console.log(`Looking up user by username: ${username}`);
    const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
    const response = await this.client.lookupUserByUsername({ username: cleanUsername });
    if (!response.user) {
      throw new Error(`User not found: ${username}`);
    }
    return response.user;
  }

  async lookupUserByFid(fid: number): Promise<User> {
    console.log(`Looking up user by FID: ${fid}`);
    const response = await this.client.fetchBulkUsers({ fids: [fid] });
    if (!response.users?.[0]) {
      throw new Error(`User not found for FID: ${fid}`);
    }
    return response.users[0];
  }
} 