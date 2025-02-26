import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { config } from './config.js';
import endpoints from './api/endpoints.js';

const app = new Hono();

// Serve static files from the public directory
app.use('/static/*', serveStatic({ root: './public' }));

// Serve .well-known directory for Farcaster manifest
app.use('/.well-known/*', serveStatic({ root: './public' }));

// Mount the frame routes
app.route('/', endpoints);

console.log(`Starting server on port ${config.port}...`);
serve({
  fetch: app.fetch,
  port: config.port
});