import { config } from '../config.js';
import type { FrameOptions } from '../types/frame.js';
import { render } from './template.js';

// Helper function to clean URLs
export function cleanUrl(url: string): string {
  return url.replace(/([^:])\/{2,}/g, "$1/");
}

/**
 * Generate frame metadata HTML
 * 
 * For in-feed frames (embedded in casts):
 * - Use JSON stringified format with proper escaping
 * - Include version, imageUrl, and button properties
 * - Use name attribute for in-feed frames (this is what works with Farcaster)
 * 
 * For full frames (after clicking in-feed button):
 * - Use individual meta tags with property attribute
 * - Include separate tags for image, buttons, input, etc.
 */
export function generateFrameMetadata(frameMetadata: any): string {

  if (frameMetadata.button?.action?.type === 'launch_frame') {
    
    // In-feed frame with launch button (embedded in casts)
    // This MUST use JSON stringified format following Farcaster Frames v2 spec
    const embedJson = {
      version: "next", // must be "next"
      imageUrl: frameMetadata.imageUrl, // Must be 3:2 aspect ratio and < 10MB
      button: {
        title: frameMetadata.button.title, // Max 32 chars
        action: {
          type: "launch_frame", // Must be exactly "launch_frame" 
          name: frameMetadata.button.action.name || "Six Degrees of Farcaster", // Max 32 chars
          url: frameMetadata.button.action.url,
          splashImageUrl: frameMetadata.button.action.splashImageUrl || cleanUrl(`${config.hostUrl}/static/splash.png`),
          splashBackgroundColor: frameMetadata.button.action.splashBackgroundColor || "#191919"
        }
      }
    };
    
    // Serialize to JSON and replace quotes with HTML entities
    // Some clients may expect HTML-encoded entities rather than literal quotes?
    const jsonContent = JSON.stringify(embedJson);
    
    // Note: name attribute essential for in-feed frames
    return `<meta name="fc:frame" content="${jsonContent.replace(/"/g, '&quot;')}" />`;
    
  } else {

    // Full frame with input and post button
    // This uses individual meta tags following Farcaster Frames v2 spec
    // For full frames, we use property attribute
    let metaTags = `<meta property="fc:frame" content="next" />`;
    metaTags += `<meta property="fc:frame:image" content="${frameMetadata.imageUrl}" />`;
    
    if (frameMetadata.input) {
      metaTags += `<meta property="fc:frame:input:text" content="${frameMetadata.input.text}" />`;
    }
    
    // Add button tags - using property attribute per spec
    if (frameMetadata.buttons) {
      frameMetadata.buttons.forEach((btn: any, i: number) => {
        metaTags += `<meta property="fc:frame:button:${i + 1}" content="${btn.label}" />`;
        metaTags += `<meta property="fc:frame:button:${i + 1}:action" content="${btn.action || 'post'}" />`;
      });
    }
    
    if (frameMetadata.postUrl) {
      metaTags += `<meta property="fc:frame:post_url" content="${frameMetadata.postUrl}" />`;
    }
    
    if (frameMetadata.state) {
      metaTags += `<meta property="fc:frame:state" content='${JSON.stringify(frameMetadata.state)}' />`;
    }
    
    return metaTags;
  }
}

/**
 * Generate HTML for a frame
 */
export function generateFrameHtml(options: FrameOptions): string {
  const {
    title,
    description = "Find the shortest path between any two Farcaster users",
    imageUrl,
    frameMetadata,
    content,
    includeFrameSDK = false
  } = options;

  // Generate frame metadata without newlines
  const frameMetadataHtml = generateFrameMetadata(frameMetadata);
  
  // For the home page, we use a direct HTML approach
  if (frameMetadata.button?.action?.type === 'launch_frame') {
    return render('home', {
      title,
      description,
      imageUrl,
      frameMetadata: frameMetadataHtml, // Use the clean metadata format
      hostUrl: config.hostUrl,
      frameUrl: frameMetadata.button.action.url,
      includeFrameSDK
    });
  }
  
  // For other pages, we use the content provided
  return render('base', {
    title,
    description,
    imageUrl,
    frameMetadata: frameMetadataHtml, // Use the clean metadata format
    hostUrl: config.hostUrl,
    content,
    includeFrameSDK
  });
}