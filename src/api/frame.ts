import { Hono } from 'hono';
import { NeynarService } from '../services/neynar.js';
import { config } from '../config.js';
import { generateFrameHtml, cleanUrl } from '../utils/frame.js';
import type { FrameMetadata } from '../types/frame.js';

const app = new Hono();
const neynar = new NeynarService();

// A frame URL must have a FrameEmbed in a serialized form in the fc:frame meta tag in the HTML <head>. 
// When this URL is rendered in a cast, the image is displayed in a 3:2 ratio with a button underneath. 
// Clicking the button will open an app frame to the provided action url and use the splash page to 
// animate the transition.

//----------- This is the in-feed endpoint
app.get('/', async (c) => {
  console.log('Initial frame loaded');
  
  const imageUrl = cleanUrl(`${config.hostUrl}/static/initial.png`);
  const frameUrl = cleanUrl(`${config.hostUrl}/frame`);

  const frameMetadata: FrameMetadata = {
    version: "next",
    imageUrl: imageUrl,
    button: {
      title: "Find Connection",
      action: {
        type: "launch_frame",
        name: "Six Degrees of Farcaster",
        url: frameUrl,
        splashImageUrl: cleanUrl(`${config.hostUrl}/static/splash.png`),
        splashBackgroundColor: "#191919"
      }
    }
  };

  return c.html(generateFrameHtml({
    title: "Six Degrees of Farcaster",
    imageUrl,
    frameMetadata,
    content: `
      <h1>Six Degrees of Farcaster</h1>
      <p>Find the shortest path between any two Farcaster users.</p>
    `
  }));
});

//----------- Endpoint for the full frame that opens after clicking the in-frame button
app.get('/frame', async (c) => {
  console.log('Full frame loaded');
  
  const searchImageUrl = cleanUrl(`${config.hostUrl}/static/search.png`);
  const postUrl = cleanUrl(`${config.hostUrl}/search`);

  const frameMetadata: FrameMetadata = {
    version: "next",
    imageUrl: searchImageUrl,
    input: {
      text: "Enter first username"
    },
    buttons: [{
      label: "Search",
      action: "post"
    }],
    postUrl: postUrl
  };

  return c.html(generateFrameHtml({
    title: "Find Connection",
    imageUrl: searchImageUrl,
    frameMetadata,
    content: `
      <h1>Enter Username</h1>
      <p>Enter the first username to find connections.</p>
    `,
    includeFrameSDK: true
  }));
});

app.post('/search', async (c) => {
  console.log('Search endpoint hit');
  const headers = Object.fromEntries(c.req.raw.headers.entries());
  console.log('Request headers:', headers);
  const data = await c.req.formData();
  console.log('Form data:', Object.fromEntries(data.entries()));
  const firstUser = data.get('text')?.toString() || '';

  if (!firstUser) {
    const errorImageUrl = cleanUrl(`${config.hostUrl}/static/error.png`);
    const homeUrl = cleanUrl(`${config.hostUrl}`);

    const frameMetadata: FrameMetadata = {
      version: "next",
      imageUrl: errorImageUrl,
      buttons: [
        {
          label: "Try Again",
          action: "post"
        }
      ],
      postUrl: homeUrl
    };

    return c.html(generateFrameHtml({
      title: "Error",
      imageUrl: errorImageUrl,
      frameMetadata,
      content: `<p>Please enter a username</p>`,
      description: undefined
    }));
  }

  try {
    console.log('Looking up user:', firstUser);
    const user = await neynar.getUserByUsername(firstUser);
    console.log('User found:', user.fid);
    
    const searchImageUrl = cleanUrl(`${config.hostUrl}/static/search.png`);
    const resultUrl = cleanUrl(`${config.hostUrl}/result`);

    const frameMetadata: FrameMetadata = {
      version: "next",
      imageUrl: searchImageUrl,
      input: {
        text: "Enter second username"
      },
      buttons: [
        {
          label: "Search",
          action: "post"
        }
      ],
      postUrl: resultUrl,
      state: { firstUser, from_fid: user.fid }
    };

    return c.html(generateFrameHtml({
      title: "Enter Second Username",
      imageUrl: searchImageUrl,
      frameMetadata,
      content: `<p>First user: ${firstUser}</p>`,
      description: undefined
    }));
  } catch (error) {
    console.error('Error looking up user:', error);
    const errorImageUrl = cleanUrl(`${config.hostUrl}/static/error.png`);
    const homeUrl = cleanUrl(`${config.hostUrl}`);

    const frameMetadata: FrameMetadata = {
      version: "next",
      imageUrl: errorImageUrl,
      buttons: [
        {
          label: "Try Again",
          action: "post"
        }
      ],
      postUrl: homeUrl
    };

    return c.html(generateFrameHtml({
      title: "Error",
      imageUrl: errorImageUrl,
      frameMetadata,
      content: `<p>User not found. Please try again.</p>`,
      description: undefined
    }));
  }
});

export default app;
