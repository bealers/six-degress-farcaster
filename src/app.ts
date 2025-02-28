import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { config } from './config.js';
import router from './routes/index.js';
import { logger } from './utils/logger.js';

export function createApp() {
  logger.info(`Initializing application in ${config.isDev ? 'development' : 'production'} mode`);
  
  const app = new Hono();
  
  // Middleware for request logging
  app.use('*', async (c, next) => {
    logger.debug(`${c.req.method} ${c.req.url}`);
    await next();
  });
  
  // Serve static files
  logger.debug('Configuring static file serving');
  app.use('/static/*', serveStatic({ root: './public' }));
  app.use('/.well-known/*', serveStatic({ root: './public' }));
  
  // Mount all routes
  logger.debug('Mounting route handlers');
  app.route('/', router);
  
  logger.info('Application initialized successfully');
  return app;
}

// Create a singleton instance
const app = createApp();

// Export both the factory function and the singleton
export default app;