import { Hono } from 'hono';
import { NeynarService } from '../services/neynar.js';
import { ConnectionService } from '../services/connection.js';
import { config } from '../config.js';
import { generateFrameHtml, cleanUrl, generateFrameMetadata } from '../utils/frame.js';
import { render } from '../utils/template.js';
import type { FrameMetadata } from '../types/frame.js';

const app = new Hono();
const neynar = new NeynarService();
const connectionService = new ConnectionService(config.neynar.hubUrl || 'http://localhost:2281');

// List of famous Farcaster personalities
const famousPeople = [
  { username: 'vitalik.eth', display: 'Vitalik Buterin', fid: 5650 },
  { username: 'dwr.eth', display: 'Dan Romero', fid: 3 },
  { username: 'varunsrin.eth', display: 'Varun Srinivasan', fid: 2 },
  { username: 'santi.eth', display: 'Santiago Santos', fid: 26406 },
  { username: 'jessepollak.eth', display: 'Jesse Pollak', fid: 10001 },
  { username: 'naval', display: 'Naval Ravikant', fid: 174 }
];

// A frame URL must have a FrameEmbed in a serialized form in the fc:frame meta tag in the HTML <head>. 
// When this URL is rendered in a cast, the image is displayed in a 3:2 ratio with a button underneath. 
// Clicking the button will open an app frame to the provided action url and use the splash page to 
// animate the transition.

//----------- This is the in-feed endpoint
app.get('/', async (c) => {
  console.log('Initial frame loaded');
  
  const imageUrl = cleanUrl(`${config.hostUrl}/static/initial.png`);
  const frameUrl = cleanUrl(`${config.hostUrl}/frame`);
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
app.get('/frame', async (c) => {
  console.log('Full frame loaded');
  
  const searchImageUrl = cleanUrl(`${config.hostUrl}/static/search.png`);
  const selectUrl = cleanUrl(`${config.hostUrl}/select`);

  // Generate buttons for each famous person
  const personButtons = famousPeople.slice(0, 4).map((person, index) => ({
    label: person.display,
    action: "post",
    index: index + 1
  }));

  const frameMetadata: FrameMetadata = {
    version: "next",
    imageUrl: searchImageUrl,
    buttons: personButtons.map(btn => ({
      label: btn.label,
      action: btn.action
    })),
    postUrl: selectUrl
  };

  // Use the frame template directly
  return c.html(render('frame', {
    title: "Choose a Farcaster Personality",
    description: "Discover your social network path to a Farcaster personality",
    imageUrl: searchImageUrl,
    frameMetadata: generateFrameMetadata(frameMetadata),
    hostUrl: config.hostUrl,
    buttons: personButtons,
    selectUrl,
    includeFrameSDK: true
  }));
});

// Endpoint for selecting a celebrity or entering a custom one
app.post('/select', async (c) => {
  console.log('Select endpoint hit');
  const headers = Object.fromEntries(c.req.raw.headers.entries());
  console.log('Request headers:', headers);
  const data = await c.req.formData();
  console.log('Form data:', Object.fromEntries(data.entries()));
  
  // Get the selected button index (1-based)
  const buttonIndex = parseInt(data.get('buttonIndex')?.toString() || '0');
  
  // If it's the last button (custom entry), show input field
  if (buttonIndex === 4) { // Last button is "Enter Custom Username"
    const searchImageUrl = cleanUrl(`${config.hostUrl}/static/search.png`);
    const customUrl = cleanUrl(`${config.hostUrl}/custom`);

    const frameMetadata: FrameMetadata = {
      version: "next",
      imageUrl: searchImageUrl,
      input: {
        text: "Enter Farcaster username"
      },
      buttons: [{
        label: "Find Connection",
        action: "post"
      }],
      postUrl: customUrl
    };

    return c.html(render('custom', {
      title: "Enter Username",
      description: "Enter any Farcaster username to map your social connection",
      imageUrl: searchImageUrl,
      frameMetadata: generateFrameMetadata(frameMetadata),
      hostUrl: config.hostUrl,
      customUrl,
      inputText: "Enter Farcaster username",
      includeFrameSDK: true
    }));
  } 
  
  // Otherwise, use the selected famous person
  const selectedIndex = buttonIndex - 1;
  if (selectedIndex >= 0 && selectedIndex < famousPeople.length) {
    const selectedPerson = famousPeople[selectedIndex];
    return await connectionService.calculateConnection(c, selectedPerson.username);
  }
  
  // Fallback to error
  const errorImageUrl = cleanUrl(`${config.hostUrl}/static/error.png`);
  const homeUrl = cleanUrl(`${config.hostUrl}/frame`);

  return c.html(render('error', {
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
    errorMessage: "Invalid selection. Please try again.",
    homeUrl,
    includeFrameSDK: true
  }));
});

// Endpoint for custom username entry
app.post('/custom', async (c) => {
  console.log('Custom username endpoint hit');
  const data = await c.req.formData();
  const username = data.get('text')?.toString() || '';

  if (!username) {
    const errorImageUrl = cleanUrl(`${config.hostUrl}/static/error.png`);
    const homeUrl = cleanUrl(`${config.hostUrl}/frame`);

    return c.html(render('error', {
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
      errorMessage: "Please enter a username",
      homeUrl,
      includeFrameSDK: true
    }));
  }

  return await connectionService.calculateConnection(c, username);
});

// Share endpoint for creating shareable frames
app.post('/share', async (c) => {
  console.log('Share endpoint hit');
  const data = await c.req.formData();
  const buttonIndex = parseInt(data.get('buttonIndex')?.toString() || '0');
  const state = data.get('state')?.toString() || '{}';
  const stateObj = JSON.parse(state);
  
  if (buttonIndex === 1) { // Share My Connection
    const { targetUsername, degree } = stateObj;
    
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
      degree: degree,
      plural: degree > 1,
      includeFrameSDK: true
    }));
  } else { // Try Another
    return c.redirect('/frame');
  }
});

export default app;

