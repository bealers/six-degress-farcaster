import { Hono, Context } from 'hono';
import { getConnectionService, getUserService, getFrameService } from '../services/factory.js';
import { render } from '../utils/template.js';
import { config } from '../config.js';

// Create a sub-app for connection routes
const routes = new Hono();

// Get services
const connectionService = getConnectionService();
const userService = getUserService();
const frameService = getFrameService();

/**
 * Process a connection request and render the result
 */
async function processConnectionRequest(
  c: Context, 
  viewerFid: number, 
  targetInfo: { targetUsername?: string, targetFid: number }
) {
  const { targetUsername, targetFid } = targetInfo;
  
  // Find the connection
  const connection = await connectionService.findConnection(viewerFid, targetFid);
  
  if (connection.success && connection.path) {
    console.log('[CONNECTION] Found connection:', connection.path);
    
    // Get the full user objects for the path
    const userPath = await Promise.all(
      connection.path.map((fid: number) => userService.getUserByFid(fid))
    );
    
    // Generate the result frame
    const frameData = await frameService.generateConnectionResultFrame(userPath);
    
    // Create HTML for the response
    return c.html(render('result', {
      title: frameData.title,
      description: frameData.description,
      imageUrl: frameData.image,
      frameMetadata: frameService.generateFrameMetadata({
        imageUrl: frameData.image,
        buttons: frameData.buttons,
        postUrl: `${config.hostUrl}/share`
      }),
      path: userPath,
      degreeCount: userPath.length - 1,
      hostUrl: config.hostUrl
    }));
  } else {
    return c.html(await frameService.generateErrorHtml(
      `No connection found between you and ${targetUsername ? '@'+targetUsername : 'this user'}.`
    ));
  }
}

// used when selecting a user from the choose screen
routes.get('/calculate', async (c) => {
  try {
    // Extract target FID from query parameters
    const { toFid } = frameService.extractUserInfo(c);
    console.log('[/calculate GET] Target FID:', toFid);

    if (!toFid) {
      console.log('[/calculate GET] No target FID provided, redirecting to choose page');
      return c.redirect('/choose');
    }

    // Get viewer's FID
    const viewerFid = await userService.getCurrentUserFid(c);
    console.log(`[/calculate GET] Current user FID: ${viewerFid}`);
    
    if (!viewerFid) {
      return c.html(await frameService.generateErrorHtml(
        "Could not identify your user account. Please ensure you're using a Farcaster client."
      ));
    }
    
    // Process the connection request with FID only
    return await processConnectionRequest(c, viewerFid, { targetFid: toFid });
    
  } catch (error) {
    console.error('[/calculate GET] Error:', error);
    return c.html(await frameService.generateErrorHtml(
      "Error finding connection. Please try again."
    ));
  }
});

// POST route - can handle either username or FID from the form
routes.post('/calculate', async (c) => {
  try {
    // Parse the form data
    const data = await c.req.formData();
    
    // Get the identifier from form data - could be username or FID
    const identifier = data.get('username')?.toString() || '';
    
    if (!identifier) {
      return c.html(await frameService.generateErrorHtml(
        "Please enter a username or FID to find your connection."
      ));
    }
    
    console.log(`[/calculate POST] Looking up connection to: ${identifier}`);
    
    // Get viewer's FID
    const viewerFid = await userService.getCurrentUserFid(c);
    
    if (!viewerFid) {
      return c.html(await frameService.generateErrorHtml(
        "Could not determine your user ID. Please ensure you're using a Farcaster client."
      ));
    }
    
    // Determine if the identifier is a FID or username
    let targetFid: number | undefined;
    let targetUsername: string | undefined;
    
    // Check if the identifier is a number (FID)
    if (/^\d+$/.test(identifier)) {
      targetFid = parseInt(identifier, 10);
      const user = await userService.getUserByFid(targetFid);
      if (user) {
        targetUsername = user.username;
      }
    } else {
      // Treat as username
      targetUsername = identifier;
      const user = await userService.getUserByUsername(targetUsername);
      if (user) {
        targetFid = user.fid;
      }
    }
    
    if (!targetFid) {
      return c.html(await frameService.generateErrorHtml(
        `User ${targetUsername ? '@'+targetUsername : identifier} not found. Please check and try again.`
      ));
    }
    
    // Process the connection request
    return await processConnectionRequest(c, viewerFid, { targetFid, targetUsername });
    
  } catch (error) {
    console.error('[/calculate POST] Error:', error);
    return c.html(await frameService.generateErrorHtml(
      "Error finding connection. Please try again."
    ));
  }
});

// Export the routes
export default routes; 