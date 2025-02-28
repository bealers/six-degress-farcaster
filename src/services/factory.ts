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
import { Database } from './db.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('FACTORY');

// Singleton instances
let socialGraphAPIInstance: GraphAPI | null = null;
let connectionServiceInstance: ConnectionService | null = null;
let userServiceInstance: UserService | null = null;
let frameServiceInstance: FrameService | null = null;
let databaseInstance: Database | null = null;
let neynarInstance: NeynarService | null = null;

/**
 * Factory function to get the social graph API implementation
 */
export function getSocialGraphAPI(): GraphAPI {
  if (!socialGraphAPIInstance) {
    const neynarApiKey = config.neynar.apiKey;
    logger.info(`Creating new NeynarService singleton instance with key: ${neynarApiKey ? '****' + neynarApiKey.slice(-4) : 'undefined'}`);
    
    // Create and store the instance
    socialGraphAPIInstance = new NeynarService(neynarApiKey);
  } else {
    logger.debug(`Reusing existing NeynarService instance`);
  }
  
  return socialGraphAPIInstance;
}

/**
 * Get the database instance
 */
export function getDatabase(): Database {
  if (!databaseInstance) {
    logger.info('Creating new Database instance');
    databaseInstance = new Database(
      config.database.url,
      config.database.authToken
    );
  } else {
    logger.debug('Reusing existing Database instance');
  }
  return databaseInstance;
}

/**
 * Get the NeynarService instance (our GraphAPI implementation)
 */
export function getNeynarService(): NeynarService {
  if (!neynarInstance) {
    logger.info(`Creating new NeynarService singleton instance with key: ${config.neynar.apiKey.slice(0, 4) + '****' + config.neynar.apiKey.slice(-4)}`);
    neynarInstance = new NeynarService(config.neynar.apiKey);
  } else {
    logger.debug(`Reusing existing NeynarService instance`);
  }
  return neynarInstance;
}

/**
 * Get the UserService instance
 */
export function getUserService(): UserService {
  if (!userServiceInstance) {
    const neynarService = getNeynarService();
    logger.info(`Creating new UserService instance`);
    userServiceInstance = new UserService(neynarService);
  } else {
    logger.debug(`Reusing existing UserService instance`);
  }
  return userServiceInstance;
}

/**
 * Get the ConnectionService instance
 */
export function getConnectionService(): ConnectionService {
  if (!connectionServiceInstance) {
    logger.info(`Creating new ConnectionService instance`);
    
    // Make sure to initialize dependencies first
    const db = getDatabase();
    const graphAPI = getNeynarService();
    const userService = getUserService();
    
    // Create the ConnectionService with the correct dependencies
    connectionServiceInstance = new ConnectionService(
      db, 
      graphAPI, 
      userService, 
      getFrameService()
    );
  } else {
    logger.debug(`Reusing existing ConnectionService instance`);
  }
  return connectionServiceInstance;
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