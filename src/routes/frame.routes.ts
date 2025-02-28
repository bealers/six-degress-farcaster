import { Hono } from 'hono';
import { getFrameService, getUserService } from '../services/factory.js';
import { config } from '../config.js';

// Create a sub-app for frame routes
const routes = new Hono();

// Get services
const frameService = getFrameService();
const userService = getUserService();

// Define routes
routes.get('/', async (c) => {
  // Home/index route
  return c.html(await frameService.generateHomeFrame(c));
});

routes.get('/choose', async (c) => {
  try {
    // Your choose endpoint logic
    // Copy from endpoints.ts
    return c.html(await frameService.generateChooseFrame(c));
  } catch (error) {
    console.error("[/choose] Error generating choose frame:", error);
    return c.html(await frameService.generateErrorHtml("Error loading choose frame"));
  }
});

routes.post('/choose', async (c) => {
  // Your choose POST endpoint logic
  // Copy from endpoints.ts
});

// Export the routes
export default routes; 