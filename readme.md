# Six Degrees of Farcaster

https://docs.farcaster.xyz/developers/frames/v2/spec 
https://github.com/farcasterxyz/frames-v2-demo 

A Farcaster Frame v2 that finds the shortest social path between any two Farcaster users. The project implements a simplified version of the "six degrees of separation" concept for the Farcaster social graph.

## Technical Approach

This project uses:
- TypeScript as a learning exercise
- Hono for lightweight HTTP server and Frame endpoints
- Sharp for image generation
- Frame v2 metadata for Farcaster integration

### Frame Flow
1. Initial Frame: Input field for first username
2. Second Frame: Input field for second username
3. Result Frame: Shows the connection path between users
4. Share Frame: Option to share the result

## Project Structure
```
src/
  ├── api/          # Frame endpoints
  ├── services/     # Business logic for path finding
  ├── types/        # TypeScript interfaces
  ├── utils/        # Helper functions
  ├── __tests__/    # Test files
  └── index.ts      # Server entry point
```

## Installation

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

## Environment Variables
```env
PORT=3000
HOST_URL=http://localhost:3000  # Your public URL when deployed
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
2. Set up a tunnel to your local server using `localhost.run`:
   - `cloudflared` (recommended for Linux)
   - `localhost.run`: `ssh -R 80:localhost:3000 localhost.run`
   - `ngrok` (if DNS resolution works correctly)
3. Update your `.env` file with the tunnel URL as `HOST_URL`
4. Visit [Warpcast Frame Developer Tools](https://warpcast.com/~/developers/frames)
5. Enter your tunnel URL in the "Preview Frame Embed URL" field (not the Launch Frame field)
6. Test your frame

### Tips

- When using `localhost.run`, accept the SSH key on first connection with:
  ```bash
  ssh -R 80:localhost:3000 localhost.run -o StrictHostKeyChecking=no
  ```

## Frame v2 Metadata Implementation

The frame uses v2 metadata tags following the official specification:

```html
<meta name="fc:frame" content="<stringified FrameEmbed JSON>" />
<meta property="fc:frame:image" content="${baseUrl}/static/image.png" />
<meta property="fc:frame:input:text" content="Enter username" />
<meta property="fc:frame:button:1" content="Find Connection" />
<meta property="fc:frame:post_url" content="${baseUrl}/search" />
```

Key implementation details:
- Uses proper JSON stringification for frame metadata
- Ensures clean URL formatting (no double slashes)
- Maintains state between frames using `fc:frame:state`
- Implements proper button actions and input fields

## API Endpoints

- `GET /`: Initial frame with first username input
- `POST /search`: Handle first username, request second username
- `POST /result`: Show connection path between users
- `POST /share`: Share result

## Image Generation

Frame images are generated dynamically using Sharp:
- Initial welcome screen (1200x630)
- Search interface
- Connection path visualization
- Share card

Images use:
- SVG text rendering for clarity
- System-ui font family
- Centered text layout
- White text on dark background

## Development Notes

- Frame responses include complete HTML structure with body tags
- No client-side JavaScript needed
- Images generated on-demand
- State passed through fc:frame:state
- URLs cleaned to prevent double slashes

## Testing

```bash
npm test
```

## Future Enhancements
- Expand to deeper connections (3+ degrees)
- Add daily challenges
- Implement streak tracking
- Add on-chain connection discovery
- Enhanced path visualization
- Community statistics

## Current Status

The project currently implements:
- Frame v2 spec compliance with proper metadata
- Basic frame flow (initial → search → result)
- Image generation pipeline using Sharp
- Development environment with localhost.run tunneling
- Basic project structure and TypeScript setup

## Roadmap

### 1. Data Storage Implementation
We plan to implement data storage using Turso (SQLite) for:
- Simple setup and maintenance
- Graph-like data storage
- Edge function compatibility
- Easy migration path to other solutions

Alternative options considered:
- PlanetScale (MySQL)
- Supabase (PostgreSQL)
- Upstash (Redis)

### 2. Farcaster Integration
Planned features:
- Neynar API integration
- Social graph data collection
- Regular follower relationship updates
- Efficient caching layer

### 3. Enhanced Image Generation
Improvements to result visualization:
- Visual connection path representation
- Profile picture integration
- Degree count display
- Shareable format optimization

### 4. Future Enhancements

#### Performance
- Path caching implementation
- Background graph updates
- Edge computing optimization

#### Analytics
- Popular connection tracking
- Historical path storage
- Usage statistics generation

#### Features
- Multiple path discovery
- Path strength indicators
- Common interest highlighting
- Daily challenges
- Most connected users leaderboard

#### User Experience
- Robust error handling
- Loading state management
- Invalid username handling
- Rate limiting implementation
- Privacy controls

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT