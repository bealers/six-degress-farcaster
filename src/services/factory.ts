/**
 * Service Factory - Manages service initialization and provides singleton instances
 * 
 * Centralizes the creation of service instances and manages their dependencies,
 * ensuring we don't have duplicated service initialization logic across the application.
 */

import { NeynarService } from './neynar.js';
import { ConnectionService } from './connection.js';
import { UserService } from './user.js';
import { FrameService } from './frame.js';
import { config } from '../config.js';
import { GraphAPI } from '../types/graph.js';

// Singleton instances
let socialGraphAPIInstance: GraphAPI | null = null;
let connectionServiceInstance: ConnectionService | null = null;
let userServiceInstance: UserService | null = null;
let frameServiceInstance: FrameService | null = null;

/**
 * Get or create the social graph API singleton
 * @returns A singleton instance of the GraphAPI implementation
 */
export function getSocialGraphAPI(): GraphAPI {
  if (!socialGraphAPIInstance) {
    console.log("Creating new NeynarService singleton instance");
    socialGraphAPIInstance = new NeynarService(config.neynar.apiKey);
  }
  return socialGraphAPIInstance;
}

/**
 * Get or create the connection service singleton
 * @returns A singleton instance of ConnectionService
 */
export function getConnectionService(): ConnectionService {
  if (!connectionServiceInstance) {
    const socialGraphAPI = getSocialGraphAPI();
    connectionServiceInstance = new ConnectionService(
      config.neynar.hubUrl || 'http://localhost:2281', 
      socialGraphAPI
    );
  }
  return connectionServiceInstance;
}

/**
 * Get or create the user service singleton
 * @returns A singleton instance of UserService
 */
export function getUserService(): UserService {
  if (!userServiceInstance) {
    const socialGraphAPI = getSocialGraphAPI();
    userServiceInstance = new UserService(socialGraphAPI);
  }
  return userServiceInstance;
}

/**
 * Get or create the frame service singleton
 * @returns A singleton instance of FrameService
 */
export function getFrameService(): FrameService {
  if (!frameServiceInstance) {
    const userService = getUserService();
    frameServiceInstance = new FrameService(userService);
  }
  return frameServiceInstance;
} 