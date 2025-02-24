import { Hono } from 'hono';
import { NeynarService } from '../services/neynar.js';
import { config } from '../config.js';
import { generateInitialImage } from '../utils/image.js';

const app = new Hono();
const neynar = new NeynarService();

// Helper function to clean URLs
function cleanUrl(url: string): string {
  return url.replace(/([^:])\/{2,}/g, "$1/");
}

app.get('/', async (c) => {
  console.log('Initial frame loaded');
  //const headers = Object.fromEntries(c.req.raw.headers.entries());
  //console.log('Request headers:', headers);
  
  const frameMetadata = {
    version: "next",
    imageUrl: cleanUrl(`${config.hostUrl}/static/initial.png`),
    button: {
      title: "Find Connection",
      action: {
        type: "launch_frame",
        name: "Six Degrees of Farcaster",
        url: cleanUrl(`${config.hostUrl}/search`),
        splashImageUrl: cleanUrl(`${config.hostUrl}/static/splash.png`),
        splashBackgroundColor: "#000000"
      }
    }
  };

  return c.html(`<!DOCTYPE html>
<html>
  <head>
    <title>Six Degrees of Farcaster</title>
    <meta property="og:title" content="Six Degrees of Farcaster" />
    <meta property="og:description" content="Find the shortest path between any two Farcaster users" />
    <meta property="og:image" content="${cleanUrl(`${config.hostUrl}/static/initial.png`)}" />
    <meta name="fc:frame" content='${JSON.stringify(frameMetadata)}' />
    <meta name="fc:frame:image" content="${cleanUrl(`${config.hostUrl}/static/initial.png`)}" />
    <meta name="fc:frame:image:aspect_ratio" content="1.91:1" />
    <meta name="fc:frame:input:text" content="Enter first username" />
  </head>
  <body>
    <h1>Six Degrees of Farcaster</h1>
    <p>Find the shortest path between any two Farcaster users.</p>
  </body>
</html>`);
});

app.post('/search', async (c) => {
  console.log('Search endpoint hit');
  const headers = Object.fromEntries(c.req.raw.headers.entries());
  console.log('Request headers:', headers);
  const data = await c.req.formData();
  console.log('Form data:', Object.fromEntries(data.entries()));
  const firstUser = data.get('text')?.toString() || '';

  if (!firstUser) {
    const frameMetadata = {
      version: "next",
      imageUrl: cleanUrl(`${config.hostUrl}/static/error.png`),
      button: {
        title: "Try Again",
        action: {
          type: "launch_frame",
          name: "Six Degrees of Farcaster",
          url: cleanUrl(`${config.hostUrl}`),
          splashImageUrl: cleanUrl(`${config.hostUrl}/static/splash.png`),
          splashBackgroundColor: "#000000"
        }
      }
    };

    return c.html(`<!DOCTYPE html>
<html>
  <head>
    <title>Error</title>
    <meta property="og:title" content="Error" />
    <meta property="og:image" content="${cleanUrl(`${config.hostUrl}/static/error.png`)}" />
    <meta name="fc:frame" content='${JSON.stringify(frameMetadata)}' />
    <meta name="fc:frame:image" content="${cleanUrl(`${config.hostUrl}/static/error.png`)}" />
    <meta name="fc:frame:image:aspect_ratio" content="1.91:1" />
  </head>
  <body>
    <p>Please enter a username</p>
  </body>
</html>`);
  }

  try {
    console.log('Looking up user:', firstUser);
    const user = await neynar.getUserByUsername(firstUser);
    console.log('User found:', user.fid);
    
    const frameMetadata = {
      version: "next",
      imageUrl: cleanUrl(`${config.hostUrl}/static/search.png`),
      button: {
        title: "Search",
        action: {
          type: "launch_frame",
          name: "Six Degrees of Farcaster",
          url: cleanUrl(`${config.hostUrl}/result`),
          splashImageUrl: cleanUrl(`${config.hostUrl}/static/splash.png`),
          splashBackgroundColor: "#000000"
        }
      },
      input: {
        text: "Enter second username"
      },
      state: { firstUser, from_fid: user.fid }
    };

    return c.html(`<!DOCTYPE html>
<html>
  <head>
    <title>Enter Second Username</title>
    <meta property="og:title" content="Enter Second Username" />
    <meta property="og:image" content="${cleanUrl(`${config.hostUrl}/static/search.png`)}" />
    <meta name="fc:frame" content='${JSON.stringify(frameMetadata)}' />
    <meta name="fc:frame:image" content="${cleanUrl(`${config.hostUrl}/static/search.png`)}" />
    <meta name="fc:frame:image:aspect_ratio" content="1.91:1" />
  </head>
  <body>
    <p>First user: ${firstUser}</p>
  </body>
</html>`);
  } catch (error) {
    console.error('Error looking up user:', error);
    const frameMetadata = {
      version: "next",
      imageUrl: cleanUrl(`${config.hostUrl}/static/error.png`),
      button: {
        title: "Try Again",
        action: {
          type: "launch_frame",
          name: "Six Degrees of Farcaster",
          url: cleanUrl(`${config.hostUrl}`),
          splashImageUrl: cleanUrl(`${config.hostUrl}/static/splash.png`),
          splashBackgroundColor: "#000000"
        }
      }
    };

    return c.html(`<!DOCTYPE html>
<html>
  <head>
    <title>Error</title>
    <meta property="og:title" content="Error" />
    <meta property="og:image" content="${cleanUrl(`${config.hostUrl}/static/error.png`)}" />
    <meta name="fc:frame" content='${JSON.stringify(frameMetadata)}' />
    <meta name="fc:frame:image" content="${cleanUrl(`${config.hostUrl}/static/error.png`)}" />
    <meta name="fc:frame:image:aspect_ratio" content="1.91:1" />
  </head>
  <body>
    <p>User not found. Please try again.</p>
  </body>
</html>`);
  }
});

export default app;
