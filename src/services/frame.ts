import { config } from '../config.js';
import { cleanUrl, generateFrameMetadata } from '../utils/frame.js';
import { render } from '../utils/template.js';
import type { FrameMetadata, FrameButton } from '../types/frame.js';
import { PopularUser } from '../types/graph.js';
import { UserService } from './user.js';

/**
 * Service for handling frame-related operations
 */
export class FrameService {
  private userService: UserService;

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
    
    const imageUrl = cleanUrl(`${config.hostUrl}/static/initial.png`);
    const frameUrl = cleanUrl(`${config.hostUrl}/choose`);
    const splashImageUrl = cleanUrl(`${config.hostUrl}/static/splash.png`);

    // Create in-feed frame metadata following Farcaster Frames v2 spec
    const frameMetadata: FrameMetadata = {
      version: "next", // CRITICAL: Must be "next", NOT "vNext"
      imageUrl: imageUrl, // Must be 3:2 aspect ratio and < 10MB
      button: {
        title: "How connected are you to Vitalik?", // Button text (32 char max)
        action: {
          type: "launch_frame", // MUST be this exact value for in-feed frames
          name: "Six Degrees of Farcaster", // App name (32 char max)
          url: frameUrl, // Frame launch URL
          splashImageUrl: splashImageUrl, // 200x200px splash image
          splashBackgroundColor: "#191919" // Hex color code
        }
      }
    };

    // Generate the frame metadata HTML
    const frameMetadataHtml = generateFrameMetadata(frameMetadata);
    
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
  async generateChooseFrame(context: any, currentUserFid?: number | null): Promise<string> {
    // Get a selection of popular users to display
    const displayPeople = await this.userService.getPopularUserSelection(
      config.users.displayUsersCount, // Use this for the first parameter
      currentUserFid || undefined     // Pass currentUserFid as the second parameter
    );
    
    console.log(`[FRAME] Displaying ${displayPeople.length} popular people`);
    
    const searchImageUrl = cleanUrl(`${config.hostUrl}/static/search.png`);
    const selectUrl = cleanUrl(`${config.hostUrl}/select`);
    const moreUrl = cleanUrl(`${config.hostUrl}/more`); // URL for the more button
    
    displayPeople.forEach((person, index) => {
      console.log(`[FRAME] Person ${index}: ${person.display} (@${person.username}), FID: ${person.fid}`);
    });

    // Hidden frame with actual buttons according to Farcaster Frames v2 spec
    const frameMetadata: FrameMetadata = {
      version: "next",
      imageUrl: searchImageUrl,
      buttons: [
        { label: displayPeople[0]?.display || "Person 1", action: "post" },
        { label: displayPeople[1]?.display || "Person 2", action: "post" },
        { label: displayPeople[2]?.display || "Person 3", action: "post" },
        { label: displayPeople[3]?.display || "Person 4", action: "post" },
        { label: "Custom", action: "post" }
      ],
      postUrl: selectUrl
    };
    
    // Create a "More People" button as a link
    const moreButton = `<a href="${moreUrl}" class="refresh-button">More People</a>`;

    // Use the frame template with proper button references and add footer branding
    return render('choose', {
      title: "Choose a Farcaster Personality",
      description: "Discover your social network path to a Farcaster personality",
      imageUrl: searchImageUrl,
      frameMetadata: generateFrameMetadata(frameMetadata),
      hostUrl: config.hostUrl,
      people: displayPeople,
      selectUrl,
      includeFrameSDK: true,
      moreUrl, // URL for the "more" button
      moreButton // HTML for the more button
    });
  }
  
  /**
   * Generate an error frame
   * @param context Hono context
   * @param errorMessage Error message to display
   * @returns HTML for the error frame
   */
  generateErrorFrame(context: any, errorMessage: string): string {
    const errorImageUrl = cleanUrl(`${config.hostUrl}/static/error.png`);
    const homeUrl = cleanUrl(`${config.hostUrl}/choose`);

    return render('error', {
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
      errorMessage: errorMessage,
      homeUrl,
      includeFrameSDK: true,
      footer: "Created by @bealers" // Add footer branding
    });
  }
  
  /**
   * Generate a custom search frame
   * @param context Hono context
   * @returns HTML for the custom search frame
   */
  generateCustomSearchFrame(context: any): string {
    const searchImageUrl = cleanUrl(`${config.hostUrl}/static/search.png`);
    const customUrl = cleanUrl(`${config.hostUrl}/custom`);

    const frameMetadata: FrameMetadata = {
      version: "next",
      imageUrl: searchImageUrl,
      input: {
        text: "Enter @username or FID"
      },
      buttons: [{
        label: "Find Connection",
        action: "post"
      }],
      postUrl: customUrl
    };

    return render('custom', {
      title: "Search Farcaster",
      description: "Enter any Farcaster username or FID to map your social connection",
      imageUrl: searchImageUrl,
      frameMetadata: generateFrameMetadata(frameMetadata),
      hostUrl: config.hostUrl,
      customUrl,
      inputText: "Enter username or FID",
      includeFrameSDK: true,
      footer: "Created by @bealers" // Add footer branding
    });
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
    const frameMetadataHtml = generateFrameMetadata(frameMetadata);
    
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
      frameMetadata: generateFrameMetadata(frameMetadata),
      hostUrl: config.hostUrl,
      ...additionalContext
    });
  }

  /**
   * Generate a frame for displaying connection results
   * @param c Hono context
   * @param result Connection result from PathFinder
   * @returns HTML content for the frame
   */
  async generateConnectionResultFrame(c: any, result: any): Promise<string> {
    console.log(`[FRAME SERVICE] Generating connection result frame`);
    
    try {
      // Determine which image to use based on result
      let imageUrl;
      let templateName;
      let templateData: any = {
        title: "Connection Results",
        hostUrl: config.hostUrl,
        includeFrameSDK: true,
        footer: "Created by @bealers",
      };
      
      if (result.success && result.path && result.path.length > 0) {
        // We found a connection path
        templateName = 'result';
        imageUrl = cleanUrl(`${config.hostUrl}/static/result.png`);
        
        // Add result specific data
        templateData = {
          ...templateData,
          description: `Found a connection with ${result.path.length - 1} degrees of separation`,
          imageUrl,
          frameMetadata: generateFrameMetadata({
            version: "next",
            imageUrl,
            buttons: [{
              label: "Find Another Connection",
              action: "post"
            }],
            postUrl: cleanUrl(`${config.hostUrl}/choose`)
          }),
          path: result.path,
          degree: result.path.length - 1,
          resultImageUrl: imageUrl,
          chooseUrl: cleanUrl(`${config.hostUrl}/choose`),
        };
      } else {
        // No connection found
        templateName = 'no-connection';
        imageUrl = cleanUrl(`${config.hostUrl}/static/no-connection.png`);
        
        // Add no-connection specific data
        templateData = {
          ...templateData,
          description: "No connection found between these users",
          imageUrl,
          frameMetadata: generateFrameMetadata({
            version: "next",
            imageUrl,
            buttons: [{
              label: "Try Another Connection",
              action: "post"
            }],
            postUrl: cleanUrl(`${config.hostUrl}/choose`)
          }),
          chooseUrl: cleanUrl(`${config.hostUrl}/choose`),
        };
      }
      
      return render(templateName, templateData);
    } catch (error) {
      console.error(`[FRAME SERVICE] Error generating connection result frame:`, error);
      return this.generateErrorFrame(c, "Error generating result");
    }
  }
} 