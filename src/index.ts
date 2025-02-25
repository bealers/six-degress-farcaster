import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import frame from './api/frame.js';
import { config } from './config.js';

const app = new Hono();

// Serve static files from the public directory
app.use('/static/*', serveStatic({ root: './public' }));

// Serve .well-known directory for Farcaster manifest
app.use('/.well-known/*', serveStatic({ root: './public' }));

// Mount the frame routes
app.route('/', frame);

console.log(`Starting server on port ${config.port}...`);
serve({
  fetch: app.fetch,
  port: config.port
});