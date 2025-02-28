import { NeynarService } from './neynar.js';
import { Database } from './db.js';
import { PathFinder } from './pathfinder.js';
import { config } from '../config.js';
import { render } from '../utils/template.js';
import type { User, ConnectionPath } from '../types/index.js';
import { GraphAPI } from '../types/graph.js';
import { Hono } from 'hono';
import { UserService } from './user.js';
import { FrameService } from './frame.js';

export class ConnectionService {
  private pathFinder!: PathFinder;
  private activeCalculations = 0;
  private readonly MAX_CONCURRENT = 5;

  constructor(
    private db: Database,
    private graphAPI: GraphAPI,
    private userService: UserService,
    private frameService: FrameService
  ) {
    console.log('[DATABASE] Initializing database tables');
    
    // Call the initDatabase method in the constructor
    this.initDatabase().catch(err => {
      console.error('[DATABASE] Error initializing database:', err);
    });
  }
  
  private async initDatabase() {
    console.log('[DATABASE] Initializing database tables');
    await this.db.init();
    console.log('[DATABASE] Database initialized successfully');
    
    // Only create PathFinder after database is initialized
    this.pathFinder = new PathFinder(this.db, this.graphAPI);
    console.log('[DATABASE] PathFinder initialized with database access');
  }

  /**
   * Find the shortest social connection between two users
   * @param fromFid The source user FID (or undefined if not logged in)
   * @param toFid The target user FID to connect to
   * @returns Connection result with path or error
   */
  async findConnection(fromFid: number | undefined, toFid: number): Promise<any> {
    // Validate inputs
    if (!toFid) {
      console.error('[CONNECTION] Missing target user FID');
      return { success: false, error: 'Missing target user' };
    }
    
    // In development, use fallback FID if source FID not provided
    if (!fromFid && config.isDev) {
      fromFid = config.development.fallbackFid;
      console.log(`[CONNECTION] Development mode - using fallback source FID: ${fromFid}`);
    }
    
    if (!fromFid) {
      console.error('[CONNECTION] Missing source user FID');
      return { 
        success: false, 
        error: 'Please sign in with Farcaster to find your connection'
      };
    }
    
    if (fromFid === toFid) {
      console.log('[CONNECTION] Source and target FIDs are the same');
      return { 
        success: true, 
        path: [fromFid],
        message: "That's you!"
      };
    }
    
    try {
      // Use the path finder to calculate connection
      console.log(`[CONNECTION] Finding path from FID ${fromFid} to FID ${toFid}`);
      
      const path = await this.pathFinder.findPath(fromFid, toFid);
      
      // Check if a path was found
      if (path && path.length > 0) {
        console.log(`[CONNECTION] Path found with ${path.length} nodes: ${path.join(' -> ')}`);
        return {
          success: true,
          path: path
        };
      } else {
        console.log(`[CONNECTION] No path found between FID ${fromFid} and FID ${toFid}`);
        return {
          success: false,
          error: 'No connection found'
        };
      }
    } catch (error) {
      console.error('[CONNECTION] Error finding connection:', error);
      return {
        success: false,
        error: 'Error calculating connection'
      };
    }
  }

  async getUser(username: string): Promise<User | null> {
    try {
      return await this.graphAPI.getUserByUsername(username);
    } catch (error) {
      console.error('[CONNECTION] Error getting user:', error);
      return null;
    }
  }

  /**
   * Calculate the connection between a viewer and a target user
   * @param context The HTTP context from the route handler
   * @param targetUsername The username of the target user
   * @returns HTML response with connection details
   */
  async calculateConnection(context: any, targetUsername: string) {
    try {
      console.log('[CONNECTION] Looking up target user:', targetUsername);
      const targetUser = await this.graphAPI.getUserByUsername(targetUsername);
      console.log('[CONNECTION] Target user found:', targetUser.fid);
      
      // Get viewer's FID from request - this might throw in production
      let viewerFid;
      try {
        viewerFid = this.getViewerFid(context);
        console.log('[CONNECTION] Viewer FID:', viewerFid);
      } catch (error) {
        console.error('[CONNECTION] Failed to get viewer FID:', error);
        return this.renderErrorResponse(context, "Authentication required. Please make sure you're using a Farcaster client.");
      }
      
      // Try to find a viewer username for the FID
      let viewerUsername;
      try {
        const viewerUser = await this.graphAPI.lookupUserByFid(viewerFid);
        viewerUsername = viewerUser.username;
        console.log(`[CONNECTION] Resolved viewer username: @${viewerUsername}`);
      } catch (error) {
        console.error('[CONNECTION] Error fetching viewer profile:', error);
        return this.renderErrorResponse(context, "Couldn't find your Farcaster profile. Are you connected with a Farcaster account?");
      }
      
      let connectionResult;
      let degreeOfSeparation;
      let connectionPath = null;
      
      try {
        console.log(`[CONNECTION] Searching for path between @${viewerUsername} and @${targetUsername}`);
        connectionResult = await this.findConnection(viewerFid, targetUser.fid);
        
        if (!connectionResult) {
          console.log('[CONNECTION] No path found between users');
          return this.renderNoConnectionResponse(context, targetUser);
        }
        
        degreeOfSeparation = connectionResult.path.length - 1;
        connectionPath = connectionResult.path;
        console.log(`[CONNECTION] Found path with ${degreeOfSeparation} degree(s) of separation`);
        
        // Store the search in our database
        await this.db.storeSearch({
          searcher_fid: viewerFid,
          from_fid: viewerFid,
          to_fid: targetUser.fid,
          path_json: JSON.stringify(connectionPath)
        });
        
        console.log(`[CONNECTION] Search stored in database`);
      } catch (error) {
        console.error('[CONNECTION] Error finding connection path:', error);
        return this.renderErrorResponse(context, "Error finding connection. Our servers might be busy. Please try again later.");
      }
      
      console.log(`[CONNECTION] Final degree of separation: ${degreeOfSeparation}`);
      
      const resultImageUrl = this.cleanUrl(`${config.hostUrl}/static/result.png`);
      const shareUrl = this.cleanUrl(`${config.hostUrl}/share`);
      const stateObj = { 
        targetUsername, 
        targetFid: targetUser.fid, 
        degree: degreeOfSeparation,
        pathJson: connectionPath ? JSON.stringify(connectionPath) : null
      };

      return context.html(render('result', {
        title: `Connection to ${targetUsername}`,
        description: `You are ${degreeOfSeparation} degree${degreeOfSeparation > 1 ? 's' : ''} away from ${targetUsername} in the Farcaster social graph`,
        imageUrl: resultImageUrl,
        frameMetadata: this.frameService.generateFrameMetadata({
          version: "next",
          imageUrl: resultImageUrl,
          buttons: [
            {
              label: "Share My Connection",
              action: "post"
            },
            {
              label: "Try Another",
              action: "post"
            }
          ],
          postUrl: shareUrl,
          state: stateObj
        }),
        hostUrl: config.hostUrl,
        username: targetUsername,
        targetFid: targetUser.fid,
        degree: degreeOfSeparation,
        plural: degreeOfSeparation > 1,
        shareUrl,
        state: JSON.stringify(stateObj),
        connectionPath,
        includeFrameSDK: true
      }));
    } catch (error) {
      console.error('Error looking up user:', error);
      return this.renderErrorResponse(context, "User not found. Please try again.");
    }
  }

  /**
   * Render a standardized error response
   */
  private renderErrorResponse(context: any, errorMessage: string) {
    const errorImageUrl = this.cleanUrl(`${config.hostUrl}/static/error.png`);
    const homeUrl = this.cleanUrl(`${config.hostUrl}/choose`);

    return context.html(render('error', {
      title: "Error",
      description: "An error occurred",
      imageUrl: errorImageUrl,
      frameMetadata: this.frameService.generateFrameMetadata({
        version: "next",
        imageUrl: errorImageUrl,
        buttons: [{
          label: "Try Again",
          action: "post"
        }],
        postUrl: homeUrl
      }),
      hostUrl: config.hostUrl,
      errorMessage,
      homeUrl,
      includeFrameSDK: true
    }));
  }

  /**
   * Render a response for when no connection is found
   */
  private renderNoConnectionResponse(context: any, targetUser: any) {
    const noConnectionImageUrl = this.cleanUrl(`${config.hostUrl}/static/no-connection.png`);
    const homeUrl = this.cleanUrl(`${config.hostUrl}/choose`);

    return context.html(render('no-connection', {
      title: "No Connection Found",
      description: `No connection found to ${targetUser.username}`,
      imageUrl: noConnectionImageUrl,
      frameMetadata: this.frameService.generateFrameMetadata({
        version: "next",
        imageUrl: noConnectionImageUrl,
        buttons: [{
          label: "Try Someone Else",
          action: "post"
        }],
        postUrl: homeUrl
      }),
      hostUrl: config.hostUrl,
      username: targetUser.username,
      homeUrl,
      includeFrameSDK: true
    }));
  }

  /**
   * Get the Farcaster ID of the current viewer
   * @param context The HTTP context
   * @returns The viewer's FID or throws an error in production if not available
   */
  private getViewerFid(context: any): number {
    try {
      // Extract from Farcaster Frame headers
      const headers = Object.fromEntries(context.req.raw.headers.entries());
      
      // Get the untrusted_data.fid value from the fc-frame header
      if (headers['fc-frame']) {
        const frameData = JSON.parse(headers['fc-frame']);
        if (frameData && frameData.untrusted_data && frameData.untrusted_data.fid) {
          const fid = Number(frameData.untrusted_data.fid);
          console.log(`[CONNECTION] Extracted viewer FID from headers: ${fid}`);
          return fid;
        }
      }
      
      // If we reach here, we couldn't extract the FID from headers
      if (config.isDev) {
        // In development, use the configured fallback FID
        const devFid = config.development.fallbackFid;
        console.log(`[CONNECTION] Development mode - no FID in headers, using dev FID: ${devFid}`);
        return devFid;
      } else {
        // In production, this is an error condition
        const errorMsg = 'Could not extract viewer FID from frame headers in production';
        console.error(`[CONNECTION] ${errorMsg}`);
        throw new Error(errorMsg);
      }
    } catch (error) {
      // Handle JSON parsing or other errors
      console.error('[CONNECTION] Error extracting viewer FID:', error);
      
      if (config.isDev) {
        // Only in development - use fallback
        console.log('[CONNECTION] Development fallback due to error');
        return config.development.fallbackFid;
      }
      
      // In production, propagate the error
      throw new Error('Failed to authenticate user: ' + (error as Error).message);
    }
  }

  /**
   * Reset the database by dropping and recreating all tables
   * Only available in development mode
   */
  async resetDatabase(): Promise<void> {
    if (!config.isDev) {
      throw new Error('Database reset is only available in development mode');
    }
    
    console.log('[DATABASE] Resetting database...');
    
    try {
      // We need to access the underlying db object to run DROP TABLE statements
      if (this.db['sqlite']) {
        // For SQLite
        await this.db['sqliteRun']('DROP TABLE IF EXISTS searches');
        await this.db['sqliteRun']('DROP TABLE IF EXISTS connections');
      } else if (this.db['client']) {
        // For Turso
        await this.db['client'].execute('DROP TABLE IF EXISTS searches');
        await this.db['client'].execute('DROP TABLE IF EXISTS connections');
      } else {
        throw new Error('Unable to access database connection');
      }
      
      // Recreate tables
      await this.db.init();
      
      // Reinitialize the database with the social graph API
      await this.initDatabase();
      
      console.log('[DATABASE] Database reset completed successfully');
    } catch (error) {
      console.error('[DATABASE] Error resetting database:', error);
      throw error;
    }
  }
  
  private cleanUrl(url: string): string {
    return url.replace(/([^:])\/{2,}/g, "$1/");
  }


} 