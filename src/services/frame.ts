import { config } from '../config.js';
import { render } from '../utils/template.js';
import { Context } from 'hono';
import type { FrameMetadata, FrameButton, FrameData } from '../types/frame.js';
import { PopularUser, User } from '../types/graph.js';
import { UserService } from './user.js';

/**
 * Service for handling frame-related operations
 */
export class FrameService {
  private userService: UserService;
  private hostUrl = config.hostUrl;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  /**
   * Generate a frame for the home/initial page
   * @param context Hono context
   * @returns HTML for the initial frame
   */
  generateInitialFrame(context: any): string {
    console.log('[FRAME] Initial frame loaded');
    
    const imageUrl = this.cleanUrl(`${config.hostUrl}/static/img/initial.png`);
    const frameUrl = this.cleanUrl(`${config.hostUrl}/choose`);
    const splashImageUrl = this.cleanUrl(`${config.hostUrl}/static/img/splash.png`);

    const frameMetadata: FrameMetadata = {
      version: "next",
      imageUrl: imageUrl,
      button: {
        title: "How connected are you?",
        action: {
          type: "launch_frame",
          name: "Six Degrees of Farcaster",
          url: frameUrl,
          splashImageUrl: splashImageUrl,
          splashBackgroundColor: "#191919"
        }
      }
    };

    // Generate the frame metadata HTML
    const frameMetadataHtml = this.generateFrameMetadata(frameMetadata);
    
    // Use our specialized template for in-feed frames
    return render('infeed', {
      title: "Six Degrees of Farcaster",
      description: "Find the shortest path between any two Farcaster users",
      imageUrl: imageUrl,
      frameMetadata: frameMetadataHtml,
      hostUrl: config.hostUrl,
      frameUrl: frameUrl,
      includeFrameSDK: true
    });
  }
  
  /**
   * Generate a frame for the choose personality page
   * @param context Hono context
   * @param currentUserFid Current user's FID (optional)
   * @returns HTML for the choose frame
   */
  async generateChooseFrame(c: Context, currentUserFid?: number): Promise<string> {
    try {
      // Get popular users
      const people = await this.userService.getPopularUserSelection(
        config.users.displayUsersCount,
        currentUserFid
      );
      
      // Map properties correctly for the template
      const peopleForTemplate = people.map(person => ({
        username: person.username,
        display: person.display,
        fid: person.fid,
        pfpUrl: person.pfp, // Map pfp to pfpUrl for template
        followerCount: person.followerCount
      }));
      
      // Create image and metadata
      const imageUrl = this.cleanUrl(`${config.hostUrl}/static/img/search.png`);
      const calculateUrl = this.cleanUrl(`${config.hostUrl}/calculate`);
      const moreUrl = this.cleanUrl(`${config.hostUrl}/more`);
      
      // Generate More People button HTML
      const moreButton = `<a href="${moreUrl}" class="refresh-button">More People</a>`;
      
      // Generate frame metadata
      const frameMetadata = this.generateFrameMetadata({
        version: "next",
        imageUrl: imageUrl,
        buttons: [
          ...people.map(person => ({
            label: person.display,
            action: "post"
          })),
          {
            label: "Custom",
            action: "post"
          }
        ],
        postUrl: this.cleanUrl(`${config.hostUrl}/calculate`)
      });
      
      // Render the template with the mapped data
      return render('choose', {
        title: "Choose a Farcaster Personality",
        description: "Discover your social network path to a Farcaster personality",
        imageUrl: imageUrl,
        frameMetadata: frameMetadata,
        hostUrl: config.hostUrl,
        people: peopleForTemplate, // Use the mapped data
        calculateUrl: calculateUrl, // Updated from selectUrl
        moreButton: moreButton,
        includeFrameSDK: true
      });
    } catch (error) {
      console.error("[FRAME SERVICE] Error generating choose frame:", error);
      throw error;
    }
  }
  
  /**
   * Generate an error frame data object
   */
  private generateErrorFrame(message: string, imageUrl?: string): FrameData {
    return {
      title: "Error",
      description: message,
      image: imageUrl || this.getErrorImageUrl(),
      buttons: [
        {
          label: "Try Again",
          action: "post_redirect",
          target: "/search"
        }
      ]
    };
  }
  
  /**
   * Generate a search frame
   * @param c Hono context
   * @param errorMessage Optional error message to display
   * @returns HTML for the search frame
   */
  async generateSearchFrame(c: Context, error?: string): Promise<string> {
    console.log('[FRAME SERVICE] Generating search frame');
    
    try {
      const imageUrl = this.cleanUrl(`${config.hostUrl}/static/img/search.png`);
      const source = c.req.query('source') || '';
      
      const frameMetadata = this.generateFrameMetadata({
        version: "next",
        imageUrl: imageUrl,
        buttons: [
          { label: 'Search', action: 'post' }
        ],
        postUrl: `${config.hostUrl}/search`,
        image: imageUrl
      });
      
      const frameMetadataHtml = this.generateFrameMetadata(frameMetadata);
      
      return render('search', {
        title: "Search Farcaster Users",
        description: "Find your connection to any Farcaster user",
        imageUrl: imageUrl,
        frameMetadata: frameMetadataHtml,
        hostUrl: config.hostUrl,
        error: error
      });
    } catch (error) {
      console.error('[FRAME SERVICE] Error generating search frame:', error);
      return this.generateErrorFrame("Error generating search page").toString();
    }
  }

  /**
   * Generate an in-feed frame that can be embedded in a Farcaster cast
   */
  generateInFeedFrame(
    imageUrl: string,
    buttonTitle = "Open Frame",
    appName = "Farcaster Frame",
    frameUrl: string,
    splashImageUrl?: string,
    splashBackgroundColor?: string
  ): string {
    // Create in-feed frame metadata following Farcaster Frames v2 spec
    const frameMetadata: FrameMetadata = {
      version: "next", // CRITICAL: Must be "next", NOT "vNext"
      imageUrl: imageUrl, // Must be 3:2 aspect ratio and < 10MB
      button: {
        title: buttonTitle, // Button text (32 char max)
        action: {
          type: "launch_frame", // MUST be this exact value for in-feed frames
          name: appName, // App name (32 char max)
          url: frameUrl, // Frame launch URL
          splashImageUrl, // 200x200px splash image
          splashBackgroundColor // Hex color code
        }
      }
    };
    
    // Generate the frame metadata HTML
    const frameMetadataHtml = this.generateFrameMetadata(frameMetadata);
    
    // Use our specialized template for in-feed frames
    return render('infeed', {
      title: "Farcaster Frame",
      description: "A Farcaster Frame",
      imageUrl: imageUrl,
      frameMetadata: frameMetadataHtml,
      hostUrl: config.hostUrl,
      frameUrl: frameUrl
    });
  }

  /**
   * Generate a frame for display within Farcaster clients
   */
  generateFrame(
    title: string,
    description: string,
    imageUrl: string,
    buttons: FrameButton[],
    postUrl: string,
    additionalContext: Record<string, any> = {},
  ): string {
    const frameMetadata: FrameMetadata = {
      version: "next",
      imageUrl: imageUrl,
      buttons: buttons,
      postUrl: postUrl,
    };
    
    // Use the frame template with proper button references
    return render('choose', {
      title: title,
      description: description,
      imageUrl: imageUrl,
      frameMetadata: this.generateFrameMetadata(frameMetadata),
      hostUrl: config.hostUrl,
      ...additionalContext
    });
  }

  /**
   * Generates a frame for a connection result
   */
  async generateConnectionResultFrame(path: User[]): Promise<FrameData> {
    console.log('[FRAME SERVICE] Generating connection result frame');
    
    if (!path || path.length === 0) {
      return this.generateErrorFrame("No connection found", this.getErrorImageUrl());
    }
    
    // Calculate degree of separation
    const degreeCount = path.length - 1;
    const isDirectConnection = degreeCount === 1;
    
    // Format the path description
    let pathDescription = '';
    if (path.length > 2) {
      // Skip first and last
      const pathMiddle = path.slice(1, -1);
      pathDescription = pathMiddle.map(user => `@${user.username}`).join(' → ');
    }
    
    const sourceUser = path[0];
    const targetUser = path[path.length - 1];
    
    // Set the title based on connection
    const title = `Connection Found!`;
    
    // Set description based on connection type
    let description = isDirectConnection
      ? `You are directly connected to @${targetUser.username} in the Farcaster social graph!`
      : `You are ${degreeCount} degree${degreeCount > 1 ? 's' : ''} away from @${targetUser.username} in the Farcaster social graph.`;
    
    // Add path info if there are intermediate nodes
    if (pathDescription) {
      description += ` Connected through ${pathDescription}`;
    }
    
    return {
      buttons: [
        {
          label: "Share Connection",
          action: "post"
        },
        {
          label: "Try Another",
          action: "post_redirect",
          target: "/search"
        }
      ],
      image: `/api/connection/image?path=${encodeURIComponent(JSON.stringify(path.map(u => u.fid)))}`,
      title,
      description
    };
  }

  getErrorImageUrl(): string {
    return this.cleanUrl(`${this.hostUrl}/static/error.png`);
  }

  /**
   * Generate the home page frame that works both in browser and in-feed
   */
  async generateHomeFrame(c: Context): Promise<string> {
    try {
      // Check if we're in an embedded frame vs browser
      const isEmbedded = c.req.header('User-Agent')?.includes('Farcaster') || 
                        !!c.req.query('embedded');
      
      // Set variables for either mode
      const imageUrl = this.cleanUrl(`${config.hostUrl}/static/img/home.png`);
      const chooseUrl = this.cleanUrl(`${config.hostUrl}/choose`);
      
      if (isEmbedded) {
        // IN-FEED EXPERIENCE
        // Use simpler UI optimized for in-feed
        const frameMetadata = this.generateFrameMetadata({
          imageUrl,
          buttons: [
            {
              label: "Start",
              action: "post_redirect" 
            }
          ],
          postUrl: chooseUrl
        });
        
        return render('infeed', {
          title: "Six Degrees of Farcaster",
          description: "Find your path to other Farcaster users",
          imageUrl,
          frameMetadata,
          hostUrl: config.hostUrl
        });
      } else {
        // BROWSER EXPERIENCE
        // More detailed UI with explanations
        const frameMetadata = this.generateFrameMetadata({
          imageUrl,
          button: {
            title: "Launch Frame",
            action: {
              type: "launch_frame",
              url: chooseUrl
            }
          }
        });
        
        return render('home', {
          title: "Six Degrees of Farcaster",
          description: "Discover your social connections across the Farcaster network",
          imageUrl,
          frameMetadata,
          hostUrl: config.hostUrl,
          frameUrl: chooseUrl,
          includeFrameSDK: true
        });
      }
    } catch (error) {
      console.error("[FRAME SERVICE] Error generating home frame:", error);
      return this.generateErrorFrame("Error loading home page").toString();
    }
  }

  /**
   * Generate frame metadata HTML based on frame type
   * @private
   */
  generateFrameMetadata(options: any): string {

    // Handle in-feed frames (with launch button)
    if (options.button?.action?.type === 'launch_frame') {
      return `<meta property="fc:frame" content="next" />
        <meta property="fc:frame:image" content="${options.imageUrl}" />
        <meta property="fc:frame:button:1" content="${options.button.title}" />
        <meta property="fc:frame:button:1:action" content="post_redirect" />
        <meta property="fc:frame:post_url" content="${options.button.action.url}" />`;
    }
    
    // Handle interactive frames (with buttons)
    return `<meta property="fc:frame" content="next" />
        <meta property="fc:frame:image" content="${options.image || options.imageUrl}" />
        ${options.buttons?.map((button: any, i: number) => 
          `<meta property="fc:frame:button:${i+1}" content="${button.label}" />
          <meta property="fc:frame:button:${i+1}:action" content="${button.action}" />`
        ).join('\n')}
        <meta property="fc:frame:post_url" content="${options.postUrl}" />`;
  }

  /**
   * Generate an error frame as HTML (for route handlers)
   */
  async generateErrorHtml(message: string, imageUrl?: string): Promise<string> {
    const frameData = this.generateErrorFrame(message, imageUrl);
    const frameMetadata = this.generateFrameMetadata({
      image: frameData.image,
      buttons: frameData.buttons,
      postUrl: `${this.hostUrl}/search`
    });
    
    return render('error', {
      title: frameData.title,
      description: frameData.description,
      errorMessage: message,
      imageUrl: frameData.image,
      frameMetadata,
      hostUrl: this.hostUrl
    });
  }

  /**
   * Extract user identification information from request
   * @param c Hono context
   * @returns User identification information
   */
  extractUserInfo(c: Context) {
    // Extract FIDs or usernames from query params
    const toFid = c.req.query('toFid') ? parseInt(c.req.query('targetFid') || '', 10) : undefined;
      
    // Also get usernames if available
    const toUsername = c.req.query('toUsername');
    
    return { toFid, toUsername };
  }

  private cleanUrl(url: string): string {
    return url.replace(/([^:])\/{2,}/g, "$1/");
  }
} 