# Six Degrees of Farcaster

A Farcaster Frame v2 application that finds the shortest social path between Farcaster users. This project implements the "six degrees of separation" concept for the Farcaster social graph, allowing users to discover their connections to notable personalities and other users in the network.

## Current Implementation

Six Degrees of Farcaster displays the social connection between two Farcaster users. The application works by:

1. **User Selection**: Users can select from popular Farcaster personalities or enter a specific username
2. **Path Finding**: The app uses the Breadth-First Search algorithm to find the shortest path between users in the Farcaster social graph
3. **Connection Display**: The result shows the degrees of separation and the path between users
4. **Data Storage**: Connection data is stored in a SQLite database (local development) or Turso database (production)

The application uses real Farcaster network data from the Neynar API to find actual connections between users. All connections shown are based on real follower relationships in the Farcaster network.

## Technical Stack

- **TypeScript** - As vanilla as possible whislt i learn, no frameworks
- **Hono** - Lightweight HTTP server and frame endpoint handling
- **Handlebars** - Templating engine for HTML generation
- **Neynar SDK** - For access to the Farcaster social graph
- **Turso/SQLite** - Database for storing and retrieving connection data

## Project Structure

```
src/
  ├── api/          # Frame endpoints and route handlers
  ├── services/     # Business logic for user connections
  │   ├── db.ts     # Database service for storing connections
  │   ├── neynar.ts # Farcaster API integration
  │   └── connection.ts # Connection path finding logic
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

# Database configuration
TURSO_DATABASE_URL=your-turso-db-url  # Required in production mode
TURSO_AUTH_TOKEN=your-turso-auth-token # Required in production mode
```

## Database Setup and Implementation

The application uses:
- **SQLite** for local development
- **Turso** for production

The database schema includes tables for:
1. `searches` - Records of past connection searches
2. `connections` - Cached follower/following relationships

Connection data is stored during path discovery to improve future search performance. The application implements efficient caching to reduce API calls for repeated searches.

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

## Enhanced Connection Visualization

We've implemented a rich, interactive connection visualization that:
- Shows the actual path between users (when available from database)
- Displays intermediate users with profile pictures and usernames
- Provides fallback visualizations for simulated connections
- Scales appropriately for different degrees of separation
- Includes tooltips and explanatory text about the connection

This creates a more engaging and informative experience for users, clearly displaying how they're connected to other Farcaster users.

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

- ✅ In-feed frame works with proper meta tags
- ✅ Full frame opens with popular personalities selection
- ✅ Connection calculation works for selected personalities
- ✅ Database integration for storing real connections
- ✅ Rich connection visualization 
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
- [Turso Documentation](https://docs.turso.tech)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT 