# Six Degrees of Farcaster

A Farcaster Frame v2 application that finds the shortest social path between Farcaster users. This project implements the "six degrees of separation" concept for the Farcaster social graph, allowing users to discover their connections to notable personalities and other users in the network.

## Overview

Six Degrees of Farcaster displays the social connection between two Farcaster users. The application works by:

1. **User Selection**: Users can select from popular Farcaster personalities or enter a specific username
2. **Path Finding**: The app uses the Breadth-First Search algorithm to find the shortest path between users in the Farcaster social graph
3. **Connection Display**: The result shows the degrees of separation and the path between users
4. **Data Storage**: Connection data is stored in a SQLite database (local development) or Turso database (production)

The application uses real Farcaster network data from the Neynar API to find actual connections between users. All connections shown are based on real follower relationships in the Farcaster network.

## Technical Stack

- **TypeScript** - Vanilla TypeScript with minimal framework dependencies
- **Hono** - Lightweight HTTP server and frame endpoint handling
- **Handlebars** - Templating engine for HTML generation
- **Neynar SDK** - For access to the Farcaster social graph
- **Turso/SQLite** - Database for storing and retrieving connection data
- **Sharp** - For image generation

## User Flow

1. User sees cast with v2 embedded frame (image with a cta button)
2. User clicks button → Opens full frame showing a selection of popular Farcaster users
3. User either
   - selects a popular user → App calculates connection path using BFS algorithm
   - searches for a specific user by username → App calculates connection path using BFS algorithm
4. Result shows: "You're X degrees away from @popular_person through @user1 → @user2"
5. Share button generates a new frame: "I'm X degrees from @popular_person! What about you?"

## Current Status

- ✅ Core infrastructure and service architecture
- ✅ Frame rendering system working in browser and Warpcast
- ✅ Local SQLite implementation with caching
- ✅ Neynar API integration for Farcaster social graph access
- ✅ BFS pathfinding for user connections
- ⚠️ Popular user selection (being fixed after refactoring)
- ❌ Initial inline frame won't render correctly in the frame validator
- ❌ Custom user search not fully functional
- ❌ Dynamic connection image generation incomplete

## Installation

```bash
# Clone the repository
git clone https://github.com/bealers/six-degrees-farcaster.git

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Generate static images
npm run generate-images

# Start development server
npm run dev
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
   - `cloudflared`: `cloudflared tunnel run <your-tunnel-name>` (recommended)
   - `localhost.run`: `ssh -R 80:localhost:3000 localhost.run`
   - `ngrok`: `ngrok http 3000`
3. Update your `.env` file with the tunnel URL as `HOST_URL`
4. Visit [Warpcast Frame Validator](https://warpcast.com/~/developers/frames)
5. Enter your tunnel URL to test your frame

## Scaling Considerations

Before deploying to production, consider these scaling aspects:

1. **Server Resources**: Evaluate compute/memory requirements for anticipated traffic
2. **API Usage Costs**: Neynar API calls should be optimized and budgeted
3. **Connection Calculation**: Path finding may be intensive for large social graphs
4. **Potential Solutions**:
   - Job queuing for intensive operations
   - Notification system for delayed processing
   - Monetization options for priority processing


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
   - NFT minting of connections
   - Path strength indicators
   - Most connected users leaderboard
   - Common interest highlighting

4. **Performance Optimizations**:
   - Path caching
   - Background graph updates
   - Job queue for intensive operations

## Resources

- [Farcaster Frames v2 Specification](https://docs.farcaster.xyz/developers/frames/v2/spec)
- [Farcaster Frames v2 Demo Repository](https://github.com/farcasterxyz/frames-v2-demo)
- [Warpcast Frame Validator](https://warpcast.com/~/developers/frames)
- [Turso Documentation](https://docs.turso.tech)
- [Neynar API Documentation](https://docs.neynar.com/)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT 