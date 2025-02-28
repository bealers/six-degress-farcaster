import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { logger } from './utils/logger.js';
import { config } from './config.js';

const PORT = process.env.PORT || 3030;

function startServer() {
  logger.info(`Starting server on port ${PORT}...`);
  
  const app = createApp();
  
  serve({
    fetch: app.fetch,
    port: Number(PORT)
  });
  
  logger.info(`Server is running at ${config.hostUrl}`);
}

// Run immediately
startServer();

export { startServer };