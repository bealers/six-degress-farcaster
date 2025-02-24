import { Hono } from 'hono';
import type { Context } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';

const app = new Hono();

// Serve static files (for images)
app.use('/static/*', serveStatic({ root: './public' }));

// Helper function to clean URLs
function cleanUrl(url: string): string {
  return url.replace(/([^:]\/)\/+/g, "$1");
}

// Initial frame endpoint
app.get('/', (c: Context) => {
  const baseUrl = process.env.HOST_URL || `https://${c.req.header('host')}`;
  
  const frameMetadata = {
    version: "next",
    imageUrl: cleanUrl(`${baseUrl}/static/initial.png`),
    button: {
      title: "Find Connection",
      action: {
        type: "launch_frame",
        name: "Six Degrees of Farcaster",
        url: cleanUrl(`${baseUrl}/search`),
        splashImageUrl: cleanUrl(`${baseUrl}/static/splash.png`),
        splashBackgroundColor: "#000000"
      }
    },
    input: {
      text: "Enter first username"
    }
  };

  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Six Degrees of Farcaster</title>
        <meta property="og:title" content="Six Degrees of Farcaster" />
        <meta property="og:description" content="Find the shortest path between any two Farcaster users" />
        <meta property="og:image" content="${cleanUrl(`${baseUrl}/static/initial.png`)}" />
        <meta name="fc:frame" content='${JSON.stringify(frameMetadata)}' />
        <meta name="fc:frame:image" content="${cleanUrl(`${baseUrl}/static/initial.png`)}" />
        <meta name="fc:frame:image:aspect_ratio" content="1.91:1" />
      </head>
      <body>
        <h1>Six Degrees of Farcaster</h1>
        <p>Find the shortest path between any two Farcaster users.</p>
      </body>
    </html>
  `);
});

// Search endpoint - handles the username input
app.post('/search', async (c: Context) => {
  const baseUrl = process.env.HOST_URL || `https://${c.req.header('host')}`;
  const data = await c.req.formData();
  const firstUser = data.get('text');
  
  const frameMetadata = {
    version: "next",
    imageUrl: cleanUrl(`${baseUrl}/static/search.png`),
    button: {
      title: "Search",
      action: {
        type: "launch_frame",
        name: "Six Degrees of Farcaster",
        url: cleanUrl(`${baseUrl}/result`),
        splashImageUrl: cleanUrl(`${baseUrl}/static/splash.png`),
        splashBackgroundColor: "#000000"
      }
    },
    input: {
      text: "Enter second username"
    },
    state: { firstUser }
  };

  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Six Degrees of Farcaster - Search</title>
        <meta property="og:title" content="Six Degrees of Farcaster" />
        <meta property="og:description" content="Enter the second username" />
        <meta property="og:image" content="${cleanUrl(`${baseUrl}/static/search.png`)}" />
        <meta name="fc:frame" content='${JSON.stringify(frameMetadata)}' />
        <meta name="fc:frame:image" content="${cleanUrl(`${baseUrl}/static/search.png`)}" />
        <meta name="fc:frame:image:aspect_ratio" content="1.91:1" />
      </head>
      <body>
        <h1>Enter Second Username</h1>
        <p>First user: ${firstUser}</p>
      </body>
    </html>
  `);
});

// Result endpoint - shows the connection path
app.post('/result', async (c: Context) => {
  const baseUrl = process.env.HOST_URL || `https://${c.req.header('host')}`;
  const data = await c.req.formData();
  const secondUser = data.get('text');
  const stateStr = data.get('state');
  const state = stateStr ? JSON.parse(stateStr as string) : {};
  const firstUser = state.firstUser;

  const frameMetadata = {
    version: "next",
    imageUrl: cleanUrl(`${baseUrl}/static/result.png`),
    button: {
      title: "Share Result",
      action: {
        type: "launch_frame",
        name: "Six Degrees of Farcaster",
        url: cleanUrl(`${baseUrl}/share`),
        splashImageUrl: cleanUrl(`${baseUrl}/static/splash.png`),
        splashBackgroundColor: "#000000"
      }
    }
  };

  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Six Degrees of Farcaster - Result</title>
        <meta property="og:title" content="Six Degrees of Farcaster" />
        <meta property="og:description" content="View the connection path" />
        <meta property="og:image" content="${cleanUrl(`${baseUrl}/static/result.png`)}" />
        <meta name="fc:frame" content='${JSON.stringify(frameMetadata)}' />
        <meta name="fc:frame:image" content="${cleanUrl(`${baseUrl}/static/result.png`)}" />
        <meta name="fc:frame:image:aspect_ratio" content="1.91:1" />
      </head>
      <body>
        <h1>Results</h1>
        <p>Finding connection between ${firstUser} and ${secondUser}...</p>
      </body>
    </html>
  `);
});

export default app; 