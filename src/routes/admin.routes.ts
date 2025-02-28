import { Hono } from 'hono';
import { getConnectionService, getNeynarService } from '../services/factory.js';
import { config } from '../config.js';

// Create a sub-app for admin routes
const routes = new Hono();

// Only availble in development
if (config.isDev) {
  
  routes.get('/debug', async (c) => {
    // Your debug endpoint logic
    return c.json({ status: "ok", mode: "development" });
  });
  
  routes.get('/reset-db', async (c) => {
    try {
      const connectionService = getConnectionService();
      await connectionService.resetDatabase();
      console.log('[DEV] Database reset successfully');
      
      return c.html(`
        <html>
          <body>
            <h1>Database Reset</h1>
            <p>Database was reset successfully.</p>
            <p><a href="/">Back to home</a></p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Error resetting database:', error);
  
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return c.html(`
        <html>
          <body>
            <h1>Database Reset Failed</h1>
            <p>Error: ${errorMessage}</p>
            <p><a href="/">Back to home</a></p>
          </body>
        </html>
      `);
    }
  });
  
  routes.get('/clear-cache', async (c) => {
    try {
      // Clear NeynarService cache
      const socialGraphAPI = getNeynarService();
      await socialGraphAPI.clearCache();
      console.log('[DEV] Cache cleared successfully');
      
      return c.html(`
        <html>
          <body>
            <h1>Cache Cleared</h1>
            <p>Cache was cleared successfully.</p>
            <p><a href="/">Back to home</a></p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Error clearing cache:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return c.html(`
        <html>
          <body>
            <h1>Cache Clear Failed</h1>
            <p>Error: ${errorMessage}</p>
            <p><a href="/">Back to home</a></p>
          </body>
        </html>
      `);
    }
  });
}

// Export the routes
export default routes; 