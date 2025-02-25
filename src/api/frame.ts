import { Hono } from 'hono';
import { NeynarService } from '../services/neynar.js';
import { ConnectionService } from '../services/connection.js';
import { config } from '../config.js';
import { generateFrameHtml, cleanUrl, generateFrameMetadata } from '../utils/frame.js';
import { render } from '../utils/template.js';
import type { FrameMetadata } from '../types/frame.js';
import { SocialGraphAPI } from '../services/api-interface.js';

const app = new Hono();
// Create a singleton instance of the social graph API
let socialGraphAPIInstance: SocialGraphAPI | null = null;

function getSocialGraphAPI(): SocialGraphAPI {
  if (!socialGraphAPIInstance) {
    console.log("Creating new NeynarService singleton instance");
    socialGraphAPIInstance = new NeynarService();
  }
  return socialGraphAPIInstance;
}

const connectionService = new ConnectionService(config.neynar.hubUrl || 'http://localhost:2281', getSocialGraphAPI());

/**
 * Get a list of notable people from the Farcaster API
 * @returns {Promise<Array>} A list of notable people
 */
async function getPopularPeople() {
  console.log(`[FRAME] Requesting popular users from API service`);
  try {

    const popularUsers = await getSocialGraphAPI().getPopularUsers(8);
    console.log(`[FRAME] Received ${popularUsers.length} popular users`);
    return popularUsers;
  } catch (error) {
    console.error(`[FRAME] Error fetching popular users:`, error);
    return []; // Return empty array - the API service already handles fallbacks
  }
}

// A frame URL must have a FrameEmbed in a serialized form in the fc:frame meta tag in the HTML <head>. 
// When this URL is rendered in a cast, the image is displayed in a 3:2 ratio with a button underneath. 
// Clicking the button will open an app frame to the provided action url and use the splash page to 
// animate the transition.

//----------- This is the in-feed endpoint
app.get('/', async (c) => {
  console.log('Initial frame loaded');
  
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
  // This template doesn't include the image in the HTML body
  // since in-feed frames only use the image URL from the meta tag
  return c.html(render('infeed-frame', {
    title: "Six Degrees of Farcaster",
    description: "Find the shortest path between any two Farcaster users",
    imageUrl: imageUrl,
    frameMetadata: frameMetadataHtml,
    hostUrl: config.hostUrl,
    frameUrl: frameUrl,
    includeFrameSDK: true
  }));
});

//----------- Endpoint for the full frame that opens after clicking the in-frame button
app.get('/choose', async (c) => {
  console.log('[CHOOSE] Choose personality frame loaded');
  
  const searchImageUrl = cleanUrl(`${config.hostUrl}/static/search.png`);
  const selectUrl = cleanUrl(`${config.hostUrl}/select`);
  
  // Get the list of popular people from our API service
  const popularPeople = await getPopularPeople();
  const displayPeople = popularPeople.slice(0, 4);

  console.log(`[CHOOSE] Displaying ${displayPeople.length} popular people`);
  displayPeople.forEach((person, index) => {
    console.log(`[CHOOSE] Person ${index}: ${person.display} (@${person.username}), FID: ${person.fid}`);
  });

  // Create a frame with hidden post fields that will be triggered by clicking profile pictures
  const frameMetadata: FrameMetadata = {
    version: "next",
    imageUrl: searchImageUrl,
    postUrl: selectUrl
  };

  // Use the frame template directly with profile pictures
  return c.html(render('frame', {
    title: "Choose a Farcaster Personality",
    description: "Discover your social network path to a Farcaster personality",
    imageUrl: searchImageUrl,
    frameMetadata: generateFrameMetadata(frameMetadata),
    hostUrl: config.hostUrl,
    people: displayPeople,
    selectUrl,
    includeFrameSDK: true
  }));
});

// Endpoint for selecting a personality or entering a custom one
app.post('/select', async (c) => {
  console.log('[SELECT] Select endpoint hit');
  const headers = Object.fromEntries(c.req.raw.headers.entries());
  console.log('[SELECT] Request headers:', headers);
  const data = await c.req.formData();
  console.log('[SELECT] Form data:', Object.fromEntries(data.entries()));
  
  // Get the selected button index (or custom value)
  const buttonIndex = data.get('buttonIndex')?.toString() || '';
  console.log(`[SELECT] Button index: "${buttonIndex}"`);
  
  // If "custom" was passed or it's the buttonIndex "custom", show search input field
  if (buttonIndex === 'custom') {
    console.log('[SELECT] Custom search option selected');
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

    return c.html(render('custom', {
      title: "Search Farcaster",
      description: "Enter any Farcaster username or FID to map your social connection",
      imageUrl: searchImageUrl,
      frameMetadata: generateFrameMetadata(frameMetadata),
      hostUrl: config.hostUrl,
      customUrl,
      inputText: "Enter username or FID",
      includeFrameSDK: true
    }));
  } 
  
  // Try to parse as a number for standard profile buttons
  const selectedIndex = parseInt(buttonIndex) || 0;
  
  // Otherwise, use the selected popular person
  try {
    const popularPeople = await getPopularPeople();
    
    if (selectedIndex >= 0 && selectedIndex < popularPeople.length) {
      const selectedPerson = popularPeople[selectedIndex];
      console.log(`[SELECT] Selected person: ${selectedPerson.display} (@${selectedPerson.username})`);
      return await connectionService.calculateConnection(c, selectedPerson.username);
    } else {
      console.log(`[SELECT] Invalid selection index: ${selectedIndex}`);
      throw new Error(`Invalid selection index: ${selectedIndex}`);
    }
  } catch (error) {
    console.error(`[SELECT] Error processing selection:`, error);
    
    // Fallback to error
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
      errorMessage: "Invalid selection. Please try again.",
      homeUrl,
      includeFrameSDK: true
    }));
  }
});

// Endpoint for custom username entry
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
      includeFrameSDK: true
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
        const user = await getSocialGraphAPI().lookupUserByFid(fid);
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

// Share endpoint for creating shareable frames
app.post('/share', async (c) => {
  console.log('[SHARE] Share endpoint hit');
  const data = await c.req.formData();
  console.log('[SHARE] Form data:', Object.fromEntries(data.entries()));
  
  const buttonIndex = parseInt(data.get('buttonIndex')?.toString() || '0');
  const state = data.get('state')?.toString() || '{}';
  console.log(`[SHARE] Button index: ${buttonIndex}, State: ${state}`);
  
  const stateObj = JSON.parse(state);
  
  if (buttonIndex === 1) { // Share My Connection
    const { targetUsername, targetFid, degree } = stateObj;
    console.log(`[SHARE] Sharing connection to ${targetUsername} (FID: ${targetFid}) with degree ${degree}`);
    
    const shareImageUrl = cleanUrl(`${config.hostUrl}/static/share.png`);
    const homeUrl = cleanUrl(`${config.hostUrl}`);
    const splashImageUrl = cleanUrl(`${config.hostUrl}/static/splash.png`);

    // Create in-feed frame metadata following Farcaster Frames v2 spec
    const frameMetadata: FrameMetadata = {
      version: "next", // CRITICAL: Must be "next", NOT "vNext"
      imageUrl: shareImageUrl,
      button: {
        title: "Check Your Connection",
        action: {
          type: "launch_frame", // MUST be this exact value for in-feed frames
          name: "Six Degrees of Farcaster",
          url: homeUrl,
          splashImageUrl: splashImageUrl,
          splashBackgroundColor: "#191919"
        }
      }
    };

    // Use our templating system to render a shareable frame
    return c.html(render('share', {
      title: "Six Degrees of Farcaster",
      description: `I'm ${degree} degree${degree > 1 ? 's' : ''} away from ${targetUsername} in the Farcaster network! What's your connection?`,
      imageUrl: shareImageUrl,
      frameMetadata: generateFrameMetadata(frameMetadata),
      hostUrl: config.hostUrl,
      homeUrl: homeUrl,
      username: targetUsername,
      targetFid: targetFid,
      degree: degree,
      plural: degree > 1,
      includeFrameSDK: true
    }));
  } else { // Try Another
    console.log('[SHARE] User chose to try another connection');
    return c.redirect('/choose');
  }
});

export default app;

