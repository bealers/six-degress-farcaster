# Six Degrees of Farcaster

A Farcaster Frame v2 application that finds the shortest social path between Farcaster users. This project implements the "six degrees of separation" concept for the Farcaster social graph, allowing users to discover their connections to notable personalities and other users in the network.

## Current Implementation

1. In-feed frame shows a notable Farcaster user (e.g., Vitalik Buterin) with the prompt "How connected are you?"
2. User clicks button → Opens full frame showing a selection of famous Farcaster users
3. User selects a personality → App calculates connection path between user and selected personality
4. Result shows: "You're X degrees away from @famous_person through @user1 → @user2"
5. Share button generates a new frame: "I'm X degrees from @famous_person! What about you?"

## Technical Stack

- **TypeScript** - As vanilla as possible whislt i learn, no frameworks
- **Hono** - Lightweight HTTP server and frame endpoint handling
- **Handlebars** - Templating engine for HTML generation
- **Neynar SDK** - For access to the Farcaster social graph

## Project Structure

```
src/
  ├── api/          # Frame endpoints and route handlers
  ├── services/     # Business logic for user connections
  ├── templates/    # Handlebars templates for frame HTML
  ├── styles/       # CSS styling
  ├── types/        # TypeScript interfaces
  ├── utils/        # Helper functions and template rendering
  └── index.ts      # Server entry point
public/
  ├── static/       # Static images and assets
  └── .well-known/  # Farcaster manifest files
```

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/six-degrees-farcaster.git

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

## Environment Variables

```env
PORT=3000
HOST_URL=https://your-public-url.com  # Your public URL when deployed
NEYNAR_API_KEY=your-neynar-api-key    # Required for Farcaster API access
```

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## Testing with Frame Developer Tools

1. Start your local server: `npm run dev`
2. Set up a tunnel to your local server using one of these tools:
   - `cloudflared` (recommended for Linux)
   - `localhost.run`: `ssh -R 80:localhost:3000 localhost.run`
   - `ngrok`: `ngrok http 3000`
3. Update your `.env` file with the tunnel URL as `HOST_URL`
4. Visit [Warpcast Frame Validator](https://warpcast.com/~/developers/frames)
5. Enter your tunnel URL to test your frame

## Farcaster Frames v2 Implementation

This project follows the Farcaster Frames v2 specification which requires specific metadata tags:

### In-feed Frame (embedded in casts)
```html
<meta name="fc:frame" content="{...JSON object...}" />
```

### Full Frame (after clicking in-feed button)
```html
<meta name="fc:frame" content="next" />
<meta name="fc:frame:image" content="https://..." />
<meta name="fc:frame:input:text" content="Enter username" />
<meta name="fc:frame:button:1" content="Find Connection" />
<meta name="fc:frame:post_url" content="https://..." />
```

## Farcaster Frames v2 Inconsistencies and Issues

During development, we encountered several inconsistencies and issues with the Farcaster Frames v2 specification:

1. **Version String Sensitivity**: 
   - The version MUST be exactly `"next"` (not `"vNext"` or other variations)
   - This must be consistent between all metadata tags and JSON files (.well-known/farcaster.json)
   
2. **HTML Escaping Issues**:
   - Frame metadata must NOT be HTML-escaped when rendered
   - When using templating engines like Handlebars, you must use triple braces `{{{frameMetadata}}}` to prevent escaping
   
3. **Metadata Format Differences**:
   - In-feed frames require stringified JSON format with all properties in one meta tag
   - Full frames use separate meta tags for each property
   
4. **Action Type Requirements**:
   - In-feed frame buttons MUST use `"type": "launch_frame"` exactly
   - Full frame buttons use different action types

5. **Image Rendering Inconsistencies**:
   - Images defined in metadata may render differently across clients
   - We needed to add multiple fallback mechanisms for images
   
6. **Configuration File Consistency**:
   - The `.well-known/farcaster.json` manifest file must match the frame metadata version
   
7. **Debugging Challenges**:
   - Error messages from the validator are not always clear
   - `NO FRAME EMBED FOUND` error can have multiple causes:
     - HTML escaping issues
     - Version inconsistency
     - Improper meta tag format
     - Issues with JSON structure

8. **Client-Specific Behaviors**:
   - Different Farcaster clients may interpret the spec differently
   - Testing across multiple clients is essential

### Comparing with amp.fun

When comparing our implementation with amp.fun (a working example), we identified these key differences:

- amp.fun uses `"action": "post"` for button actions in full frames
- They maintain strict version consistency ("next") across all metadata
- Their inline images use specific styling for reliable rendering
- They implement proper fallback mechanisms for images

## Current Status and Known Issues

- ✅ In-feed frame BROKEN with hours wasted
- ✅ Full frame opens with famous personalities selection
- ✅ Connection calculation works for selected personalities
- ❌ Custom search functionality currently broken
- ❌ Some image rendering issues on certain clients

## Future Enhancements

1. **Improved User Connection Logic**:
   - Enhanced path finding algorithm
   - Support for deeper connections (3+ degrees)
   - Multiple path discovery

2. **Enhanced User Experience**:
   - Better error handling
   - Loading states
   - More robust image rendering

3. **Additional Features**:
   - Path strength indicators
   - Most connected users leaderboard
   - Common interest highlighting

4. **Performance Optimizations**:
   - Path caching
   - Background graph updates

## Resources

- [Farcaster Frames v2 Specification](https://docs.farcaster.xyz/developers/frames/v2/spec)
- [Farcaster Frames v2 Demo Repository](https://github.com/farcasterxyz/frames-v2-demo)
- [Warpcast Frame Validator](https://warpcast.com/~/developers/frames)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
