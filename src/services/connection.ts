import { NeynarService } from './neynar.js';
import { Database } from './db.js';
import { PathFinder } from './pathfinder.js';
import { config } from '../config.js';
import { render } from '../utils/template.js';
import { cleanUrl, generateFrameMetadata } from '../utils/frame.js';
import type { User, ConnectionPath } from '../types/index.js';
import { SocialGraphAPI } from './api-interface.js';

export class ConnectionService {
  private neynar: SocialGraphAPI;
  private db: Database;
  private pathFinder!: PathFinder;

  constructor(hubUrl: string, socialGraphAPI: SocialGraphAPI) {
    // Use the provided social graph API implementation
    this.neynar = socialGraphAPI;
    
    // Initialize database connection
    this.db = new Database(
      config.database.url,
      config.database.authToken
    );
    
    // Ensure database is initialized before creating the PathFinder
    this.initDatabase().catch(err => {
      console.error('[DATABASE] Error initializing database:', err);
    });
  }
  
  private async initDatabase() {
    console.log('[DATABASE] Initializing database tables');
    await this.db.init();
    console.log('[DATABASE] Database initialized successfully');
    
    // Only create PathFinder after database is initialized
    this.pathFinder = new PathFinder(this.neynar, this.db);
    console.log('[DATABASE] PathFinder initialized with database access');
  }

  async findConnection(user1: string, user2: string): Promise<ConnectionPath | null> {
    try {
      console.log(`[CONNECTION] Finding path between ${user1} and ${user2}`);
      const path = await this.pathFinder.findPath(user1, user2);
      
      // Convert path of FIDs to usernames for display
      const users = await Promise.all(
        path.map(fid => this.neynar.lookupUserByFid(fid))
      );
      
      return {
        degree: path.length - 1, // Degree is number of edges, which is nodes - 1
        path: users.map(user => ({
          username: user.username,
          displayName: user.display_name,
          fid: user.fid,
          pfpUrl: user.pfp_url
        }))
      };
    } catch (error) {
      console.error('[CONNECTION] Error finding connection:', error);
      return null;
    }
  }

  async getUser(username: string): Promise<User | null> {
    try {
      return await this.neynar.getUserByUsername(username);
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
      const targetUser = await this.neynar.getUserByUsername(targetUsername);
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
        const viewerUser = await this.neynar.lookupUserByFid(viewerFid);
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
        connectionResult = await this.findConnection(viewerUsername, targetUsername);
        
        if (!connectionResult) {
          console.log('[CONNECTION] No path found between users');
          return this.renderNoConnectionResponse(context, targetUser);
        }
        
        degreeOfSeparation = connectionResult.degree;
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
      
      const resultImageUrl = cleanUrl(`${config.hostUrl}/static/result.png`);
      const shareUrl = cleanUrl(`${config.hostUrl}/share`);
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
        frameMetadata: generateFrameMetadata({
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
    const errorImageUrl = cleanUrl(`${config.hostUrl}/static/error.png`);
    const homeUrl = cleanUrl(`${config.hostUrl}/choose`);

    return context.html(render('error', {
      title: "Error",
      description: "An error occurred",
      imageUrl: errorImageUrl,
      frameMetadata: generateFrameMetadata({
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
    const noConnectionImageUrl = cleanUrl(`${config.hostUrl}/static/no-connection.png`);
    const homeUrl = cleanUrl(`${config.hostUrl}/choose`);

    return context.html(render('no-connection', {
      title: "No Connection Found",
      description: `No connection found to ${targetUser.username}`,
      imageUrl: noConnectionImageUrl,
      frameMetadata: generateFrameMetadata({
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
} 