import { NeynarService } from './neynar.js';
import { config } from '../config.js';
import { render } from '../utils/template.js';
import { cleanUrl, generateFrameMetadata } from '../utils/frame.js';
import type { User, ConnectionPath } from '../types/index.js';

export class ConnectionService {
  private neynar: NeynarService;

  constructor(hubUrl: string) {
    this.neynar = new NeynarService();
  }

  async findConnection(user1: string, user2: string): Promise<ConnectionPath | null> {
    // TODO: Implement path finding logic
    return null;
  }

  async getUser(username: string): Promise<User | null> {
    // TODO: Implement user lookup
    return null;
  }

  /**
   * Calculate the connection between a viewer and a target user
   * @param context The HTTP context from the route handler
   * @param targetUsername The username of the target user
   * @returns HTML response with connection details
   */
  async calculateConnection(context: any, targetUsername: string) {
    try {
      console.log('Looking up target user:', targetUsername);
      const targetUser = await this.neynar.getUserByUsername(targetUsername);
      console.log('Target user found:', targetUser.fid);
      
      // Get viewer's FID from request
      const viewerFid = this.getViewerFid(context);
      console.log('Viewer FID:', viewerFid);
      
      // For now, we'll simulate a connection path (TODO: implement actual path finding)
      const degreeOfSeparation = Math.floor(Math.random() * 3) + 1; // Random 1-3 degrees
      
      const resultImageUrl = cleanUrl(`${config.hostUrl}/static/result.png`);
      const shareUrl = cleanUrl(`${config.hostUrl}/share`);
      const stateObj = { targetUsername, targetFid: targetUser.fid, degree: degreeOfSeparation };

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
        degree: degreeOfSeparation,
        plural: degreeOfSeparation > 1,
        shareUrl,
        state: JSON.stringify(stateObj),
        includeFrameSDK: true
      }));
    } catch (error) {
      console.error('Error looking up user:', error);
      const errorImageUrl = cleanUrl(`${config.hostUrl}/static/error.png`);
      const homeUrl = cleanUrl(`${config.hostUrl}/frame`);

      return context.html(render('error', {
        title: "Error",
        description: "An error occurred",
        imageUrl: errorImageUrl,
        frameMetadata: generateFrameMetadata({
          version: "next",
          imageUrl: errorImageUrl,
          buttons: [
            {
              label: "Try Again",
              action: "post"
            }
          ],
          postUrl: homeUrl
        }),
        hostUrl: config.hostUrl,
        errorMessage: "User not found. Please try again.",
        homeUrl,
        includeFrameSDK: true
      }));
    }
  }

  /**
   * Get the Farcaster ID of the current viewer
   * @param context The HTTP context
   * @returns The viewer's FID
   */
  private getViewerFid(context: any): number {
    // In the future, extract from Farcaster Frame headers
    return 123456; // Placeholder
  }
} 