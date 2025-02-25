import { config } from '../config.js';
import type { FrameOptions } from '../types/frame.js';

// Helper function to clean URLs
export function cleanUrl(url: string): string {
  return url.replace(/([^:])\/{2,}/g, "$1/");
}

export function generateFrameHtml(options: FrameOptions): string {
  const {
    title,
    description = "Find the shortest path between any two Farcaster users",
    imageUrl,
    frameMetadata,
    content,
    includeFrameSDK = false
  } = options;

  // Generate frame meta tags based on metadata type
  let frameEmbed = '';
  
  if (frameMetadata.button?.action?.type === 'launch_frame') {
    // In-feed frame with launch button
    const embedJson = {
      version: "next",
      imageUrl: frameMetadata.imageUrl,
      button: {
        title: frameMetadata.button.title,
        action: {
          type: "launch_frame",
          name: "Six Degrees of Farcaster",
          url: frameMetadata.button.action.url,
          splashImageUrl: cleanUrl(`${config.hostUrl}/static/splash.png`),
          splashBackgroundColor: "#191919"
        }
      }
    };
    frameEmbed = `<meta name="fc:frame" content='${JSON.stringify(embedJson)}' />`;
  } else {
    // Full frame with input and post button
    frameEmbed = `
    <meta property="fc:frame" content="next" />
    <meta property="fc:frame:image" content="${frameMetadata.imageUrl}" />
    ${frameMetadata.input ? `<meta property="fc:frame:input:text" content="${frameMetadata.input.text}" />` : ''}
    ${frameMetadata.buttons?.map((btn, i) => `
    <meta property="fc:frame:button:${i + 1}" content="${btn.label}" />
    ${btn.action ? `<meta property="fc:frame:button:${i + 1}:action" content="${btn.action}" />` : ''}`).join('\n') || ''}
    ${frameMetadata.postUrl ? `<meta property="fc:frame:post_url" content="${frameMetadata.postUrl}" />` : ''}
    ${frameMetadata.state ? `<meta property="fc:frame:state" content="${JSON.stringify(frameMetadata.state)}" />` : ''}`;
  }

  return `<!DOCTYPE html>
<html>
  <head>
    <title>${title}</title>
    <meta property="og:title" content="${title}" />
    ${description ? `<meta property="og:description" content="${description}" />` : ''}
    <meta property="og:image" content="${imageUrl}" />
    
    <!-- Farcaster Frame Metadata -->
    ${frameEmbed}
    ${includeFrameSDK ? `
    <script src="https://cdn.jsdelivr.net/npm/@farcaster/frame-sdk/dist/index.min.js"></script>
    <script>
      frame.sdk.actions.ready();
    </script>` : ''}
  </head>
  <body>
    ${content}
  </body>
</html>`;
} 