import { Hono } from 'hono';
import { config } from '../config.js';
import { cleanUrl, generateFrameMetadata } from '../utils/frame.js';
import { render } from '../utils/template.js';
import type { FrameMetadata } from '../types/frame.js';
import { getSocialGraphAPI, getConnectionService, getUserService, getFrameService } from '../services/factory.js';

const app = new Hono();

// Initialize services using the factory
const socialGraphAPI = getSocialGraphAPI();
const connectionService = getConnectionService();
const userService = getUserService();
const frameService = getFrameService();

/**
 * Extract the current user's FID from the Farcaster frame context
 * @param c Hono context containing the request
 * @returns The user's FID or null if not available
 */
function getCurrentUserFid(c: any): number | null {
  let currentUserFid: number | null = null;
  
  try {
    // Extract FID from Farcaster frame headers if available
    const fcData = c.req.header('fc-data');
    if (fcData) {
      try {
        const data = JSON.parse(Buffer.from(fcData, 'base64').toString());
        currentUserFid = data.fid ? Number(data.fid) : null;
        console.log(`[API] Current user FID from frame: ${currentUserFid}`);
      } catch (err) {
        console.error(`[API] Error parsing fc-data header:`, err);
      }
    }
    
    // If no FID found in headers and we're in development, use fallback FID
    if (!currentUserFid && config.isDev) {
      currentUserFid = config.development.fallbackFid;
      console.log(`[API] Development mode - no FID in headers, using fallback FID: ${currentUserFid}`);
    }
  } catch (error) {
    console.error(`[API] Error extracting user FID:`, error);
  }
  
  return currentUserFid;
}

// A frame URL must have a FrameEmbed in a serialized form in the fc:frame meta tag in the HTML <head>. 
// When this URL is rendered in a cast, the image is displayed in a 3:2 ratio with a button underneath. 
// Clicking the button will open an app frame to the provided action url and use the splash page to 
// animate the transition.

// ---------------- in-feed endpoint ----------------
app.get('/', async (c) => {
  console.log('Initial frame loaded');
  
  const imageUrl = cleanUrl(`${config.hostUrl}/static/initial.png`);
  const frameUrl = cleanUrl(`${config.hostUrl}/choose`);
  const splashImageUrl = cleanUrl(`${config.hostUrl}/static/splash.png`);

  // Create in-feed frame metadata following Farcaster Frames v2 spec
  const frameMetadata: FrameMetadata = {
    version: "next",  // for in-feed frames
    imageUrl: imageUrl, // Must be 3:2 aspect ratio and < 10MB
    button: {
      title: "How connected are you to Vitalik?",
      action: {
        type: "launch_frame", // for in-feed frames
        name: "Six Degrees of Farcaster",
        url: frameUrl,
        splashImageUrl: splashImageUrl, // 200x200px splash image
        splashBackgroundColor: "#191919"
      }
    }
  };

  const frameMetadataHtml = generateFrameMetadata(frameMetadata);
  
  // specialized template for in-feed frames
  // doesn't include the image in the HTML body
  // in-feed frames only use the image URL from the meta tag
  return c.html(render('infeed', {
    title: "Six Degrees of Farcaster",
    description: "Find the shortest path between any two Farcaster users",
    imageUrl: imageUrl,
    frameMetadata: frameMetadataHtml,
    hostUrl: config.hostUrl,
    frameUrl: frameUrl,
    includeFrameSDK: true
  }));
});

// ---------------- full frame that opens after clicking the in-frame button ----------------
app.get('/choose', async (c) => {
  console.log('[/choose] Starting choose endpoint');
  
  // Get current user FID if available
  const currentUserFid = getCurrentUserFid(c);
  console.log(`[/choose] Current user FID: ${currentUserFid || 'none'}`);
  
  try {
    // Generate the choose frame using the service
    const html = await frameService.generateChooseFrame(c, currentUserFid || undefined);
    
    return c.html(html);
  } catch (error) {
    console.error("[/choose] Error generating choose frame:", error);
    return c.html(await frameService.generateErrorFrame(c, "Error loading choose frame"));
  }
});

// Endpoint for the "More People" button to refresh the selection
app.get('/more', async (c) => {
  console.log('[MORE] More people button pressed, redirecting to choose with new selection');
  return c.redirect('/choose');
});

// Endpoint for selecting a personality or entering a custom one
app.post('/select', async (c) => {
  console.log('[/select] Starting selection endpoint');
  
  try {
    const buttonData = await c.req.formData();
    const buttonIndex = parseInt(buttonData.get('buttonIndex')?.toString() || '0', 10);
    console.log(`[/select] Button index selected: ${buttonIndex}`);
    
    // Get current user FID if available
    const currentUserFid = getCurrentUserFid(c);
    console.log(`[/select] Current user FID: ${currentUserFid || 'none'}`);
    
    try {
      // Get popular users from service
      const displayPeople = await userService.getPopularUserSelection(config.users.displayUsersCount, currentUserFid || undefined);
      
      // Check if the button index is valid
      if (buttonIndex <= displayPeople.length && buttonIndex > 0) {
        // Calculate actual array index (button indices start at 1)
        const selectedIndex = buttonIndex - 1;
        const selectedPerson = displayPeople[selectedIndex];
        console.log(`[/select] Selected person: ${selectedPerson.username} (FID: ${selectedPerson.fid})`);
        
        // Calculate connection
        console.log(`[/select] Calculating connection between FIDs: ${currentUserFid} and ${selectedPerson.fid}`);
        const result = await connectionService.findConnection(
          currentUserFid || undefined, 
          selectedPerson.fid
        );
        console.log(`[/select] Connection result: ${JSON.stringify(result)}`);
        
        // Generate result frame - update with the correct method name
        const html = await frameService.generateConnectionResultFrame(c, result);
        
        return c.html(html);
      } else {
        console.error(`[/select] Invalid button index ${buttonIndex}. Available people: ${displayPeople.length}`);
        throw new Error(`Invalid selection index: ${buttonIndex}`);
      }
    } catch (error) {
      console.error('[/select] Error processing selection:', error);
      return c.html(await frameService.generateErrorFrame(c, "Error processing your selection"));
    }
  } catch (error) {
    console.error('[/select] Error handling form data:', error);
    return c.html(await frameService.generateErrorFrame(c, "Error processing form data"));
  }
});

// ---------------- Endpoint for custom username entry ----------------
app.post('/custom', async (c) => {
  console.log('[CUSTOM] Custom search endpoint hit');
  const data = await c.req.formData();
  console.log('[CUSTOM] Form data:', Object.fromEntries(data.entries()));
  
  const input = data.get('text')?.toString() || '';
  console.log(`[CUSTOM] User input: "${input}"`);

  if (!input) {
    console.log('[CUSTOM] Empty input received, showing error');
    const errorImageUrl = cleanUrl(`${config.hostUrl}/static/error.png`);
    const homeUrl = cleanUrl(`${config.hostUrl}/choose`);

    return c.html(render('error', {
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
      errorMessage: "Please enter a username or FID",
      homeUrl,
      includeFrameSDK: true,
      footer: "Created by @bealers" // Add footer branding
    }));
  }

  try {
    // Check if input is a numeric FID
    const isFid = /^\d+$/.test(input);
    console.log(`[CUSTOM] Input type: ${isFid ? 'FID' : 'username'}`);
    
    if (isFid) {
      // Handle FID input
      const fid = parseInt(input);
      console.log(`[CUSTOM] Looking up user by FID: ${fid}`);
      
      try {
        // First get user data from the FID
        const user = await socialGraphAPI.lookupUserByFid(fid);
        console.log(`[CUSTOM] Found user for FID ${fid}: ${user.username}`);
        
        // Then calculate connection using the username
        return await connectionService.calculateConnection(c, user.username);
      } catch (error) {
        console.error(`[CUSTOM] Error looking up FID ${fid}:`, error);
        throw new Error(`User with FID ${fid} not found`);
      }
    } else {
      // Handle username input (existing logic)
      const username = input.startsWith('@') ? input.substring(1) : input;
      console.log(`[CUSTOM] Looking up user by username: ${username}`);
      return await connectionService.calculateConnection(c, username);
    }
  } catch (error) {
    console.error(`[CUSTOM] Error processing search:`, error);
    
    const errorImageUrl = cleanUrl(`${config.hostUrl}/static/error.png`);
    const homeUrl = cleanUrl(`${config.hostUrl}/choose`);

    return c.html(render('error', {
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
      errorMessage: `User not found: ${input}`,
      homeUrl,
      includeFrameSDK: true
    }));
  }
});

// ---------------- endpoint for sharing results ----------------
app.get('/share', async (c) => {
  console.log('[SHARE] Building share card');
  
  // Get query params
  const fromUser = c.req.query('from');
  const toUser = c.req.query('to');
  const degree = c.req.query('degree');

  // Get current user from frame context
  const currentUserFid = getCurrentUserFid(c);
  console.log(`[SHARE] Share parameters - from: ${fromUser}, to: ${toUser}, degree: ${degree}, currentUser: ${currentUserFid}`);
  
  const buttonIndex = parseInt(c.req.query('buttonIndex')?.toString() || '0');
  const state = c.req.query('state')?.toString() || '{}';
  console.log(`[SHARE] Button index: ${buttonIndex}, state: ${state}`);
});

export default app;