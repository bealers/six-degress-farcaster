import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import type { ConnectionPath } from '../types/index.js';
import { fileURLToPath } from 'url';

console.log('Script starting...');

export async function generateConnectionImage(path: ConnectionPath): Promise<Buffer> {
  // TODO: Implement dynamic connection image generation
  return Buffer.from('');
}

export async function generateInitialImage(): Promise<void> {
  const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="#191919"/>
      <text x="50%" y="250" text-anchor="middle" font-family="system-ui" font-size="60" font-weight="bold" fill="white">
        Six Degrees of Farcaster
      </text>
      <text x="50%" y="330" text-anchor="middle" font-family="system-ui" font-size="28" fill="#E0E0E0">
        Everyone in the Farcaster network is connected
      </text>
      <text x="50%" y="370" text-anchor="middle" font-family="system-ui" font-size="28" fill="#E0E0E0">
        Find the shortest path between any two users
      </text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile('public/static/initial.png');
}

export async function generateSplashImage(): Promise<void> {
  const width = 200;
  const height = 200;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#191919"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="system-ui" 
        font-size="36" 
        font-weight="bold"
        fill="white" 
        text-anchor="middle" 
        dominant-baseline="middle"
      >
        6°
      </text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile('public/static/splash.png');
}

export async function generateSearchImage(): Promise<void> {
  const svg = `
    <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="800" fill="#191919"/>
      <text x="50%" y="250" text-anchor="middle" font-family="system-ui" font-size="48" font-weight="bold" fill="white">
        Who's in your network?
      </text>
      <text x="50%" y="320" text-anchor="middle" font-family="system-ui" font-size="28" fill="#E0E0E0">
        Choose a Farcaster personality to discover your degrees of separation
      </text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile('public/static/search.png');
}

export async function generateResultImage(): Promise<void> {
  const svg = `
    <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#212121;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#121212;stop-opacity:1" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="20" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      <!-- Background with gradient -->
      <rect width="1200" height="800" fill="url(#bg-gradient)"/>
      
      <!-- Decorative network lines -->
      <g opacity="0.2">
        <line x1="200" y1="100" x2="400" y2="300" stroke="#673AB7" stroke-width="2" />
        <line x1="400" y1="300" x2="700" y2="250" stroke="#673AB7" stroke-width="2" />
        <line x1="700" y1="250" x2="900" y2="150" stroke="#673AB7" stroke-width="2" />
        <line x1="900" y1="150" x2="1000" y2="400" stroke="#673AB7" stroke-width="2" />
        <line x1="1000" y1="400" x2="800" y2="600" stroke="#673AB7" stroke-width="2" />
        <line x1="800" y1="600" x2="500" y2="550" stroke="#673AB7" stroke-width="2" />
        <line x1="500" y1="550" x2="300" y2="700" stroke="#673AB7" stroke-width="2" />
        <line x1="300" y1="700" x2="200" y2="500" stroke="#673AB7" stroke-width="2" />
        <line x1="200" y1="500" x2="200" y2="100" stroke="#673AB7" stroke-width="2" />
        
        <!-- Connection nodes -->
        <circle cx="200" cy="100" r="8" fill="#9C27B0" />
        <circle cx="400" cy="300" r="8" fill="#9C27B0" />
        <circle cx="700" cy="250" r="8" fill="#9C27B0" />
        <circle cx="900" cy="150" r="8" fill="#9C27B0" />
        <circle cx="1000" cy="400" r="8" fill="#9C27B0" />
        <circle cx="800" cy="600" r="8" fill="#9C27B0" />
        <circle cx="500" cy="550" r="8" fill="#9C27B0" />
        <circle cx="300" cy="700" r="8" fill="#9C27B0" />
        <circle cx="200" cy="500" r="8" fill="#9C27B0" />
      </g>
      
      <!-- Heading with glow effect -->
      <g filter="url(#glow)">
        <text x="50%" y="200" text-anchor="middle" font-family="system-ui" font-size="56" font-weight="bold" fill="white">
          Connection Found!
        </text>
      </g>
      
      <!-- Subtitle -->
      <text x="50%" y="280" text-anchor="middle" font-family="system-ui" font-size="28" fill="#E0E0E0">
        Here's how you're connected in the social graph
      </text>
      
      <!-- Simple connection visualization -->
      <g transform="translate(350, 400)">
        <!-- First user -->
        <circle cx="0" cy="0" r="50" fill="#3F51B5" stroke="white" stroke-width="3"/>
        <text x="0" y="10" text-anchor="middle" font-family="system-ui" font-size="22" fill="white" font-weight="bold">You</text>
        
        <!-- Connection line -->
        <line x1="60" y1="0" x2="440" y2="0" stroke="white" stroke-width="3" stroke-dasharray="10,10"/>
        
        <!-- Degree badge in the middle -->
        <circle cx="250" cy="0" r="30" fill="#673AB7" stroke="white" stroke-width="2"/>
        <text x="250" y="10" text-anchor="middle" font-family="system-ui" font-size="24" fill="white" font-weight="bold">?</text>
        
        <!-- Target user -->
        <circle cx="500" cy="0" r="50" fill="#F44336" stroke="white" stroke-width="3"/>
        <text x="500" y="10" text-anchor="middle" font-family="system-ui" font-size="22" fill="white" font-weight="bold">@...</text>
      </g>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile('public/static/result.png');
}

export async function generateShareImage(): Promise<void> {
  const svg = `
    <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#4A148C;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#311B92;stop-opacity:1" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="20" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      <!-- Background with gradient -->
      <rect width="1200" height="800" fill="url(#bg-gradient)"/>
      
      <!-- Decorative network illustration -->
      <g opacity="0.3">
        <circle cx="600" cy="400" r="250" fill="none" stroke="white" stroke-width="1" />
        <circle cx="600" cy="400" r="350" fill="none" stroke="white" stroke-width="1" />
        <circle cx="600" cy="400" r="150" fill="none" stroke="white" stroke-width="1" />
        
        <!-- Random connection lines -->
        <g opacity="0.5">
          <line x1="600" y1="400" x2="800" y2="300" stroke="white" stroke-width="1" />
          <line x1="600" y1="400" x2="400" y2="300" stroke="white" stroke-width="1" />
          <line x1="600" y1="400" x2="700" y2="600" stroke="white" stroke-width="1" />
          <line x1="600" y1="400" x2="500" y2="600" stroke="white" stroke-width="1" />
          <line x1="600" y1="400" x2="900" y2="400" stroke="white" stroke-width="1" />
          <line x1="600" y1="400" x2="300" y2="400" stroke="white" stroke-width="1" />
          
          <!-- Connection nodes -->
          <circle cx="800" cy="300" r="6" fill="white" />
          <circle cx="400" cy="300" r="6" fill="white" />
          <circle cx="700" cy="600" r="6" fill="white" />
          <circle cx="500" cy="600" r="6" fill="white" />
          <circle cx="900" cy="400" r="6" fill="white" />
          <circle cx="300" cy="400" r="6" fill="white" />
        </g>
      </g>
      
      <!-- Glowing title -->
      <g filter="url(#glow)">
        <text x="50%" y="200" text-anchor="middle" font-family="system-ui" font-size="56" font-weight="bold" fill="white">
          Six Degrees of Farcaster
        </text>
      </g>
      
      <!-- Subtitle -->
      <text x="50%" y="280" text-anchor="middle" font-family="system-ui" font-size="32" fill="#E0E0E0">
        I discovered my connection!
      </text>
      
      <text x="50%" y="340" text-anchor="middle" font-family="system-ui" font-size="28" fill="#E0E0E0">
        What's yours?
      </text>
      
      <!-- Call to action -->
      <g transform="translate(450, 500)">
        <rect x="0" y="0" width="300" height="80" rx="40" fill="#7E57C2" />
        <text x="150" y="50" text-anchor="middle" font-family="system-ui" font-size="24" fill="white" font-weight="bold">
          Check Your Connection
        </text>
      </g>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile('public/static/share.png');
}

export async function generateErrorImage(): Promise<void> {
  const svg = `
    <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="800" fill="#191919"/>
      <text x="50%" y="250" text-anchor="middle" font-family="system-ui" font-size="48" font-weight="bold" fill="white">
        Connection Error
      </text>
      <text x="50%" y="320" text-anchor="middle" font-family="system-ui" font-size="28" fill="#E0E0E0">
        We couldn't find that user in the Farcaster network
      </text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile('public/static/error.png');
}

export async function generateNoConnectionImage(): Promise<void> {
  const svg = `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <!-- Background gradient -->
      <defs>
        <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4F46E5" />
          <stop offset="100%" stop-color="#2563EB" />
        </linearGradient>
        <!-- Glow filter for text -->
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="15" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      <!-- Main background -->
      <rect width="1200" height="630" fill="url(#bg-gradient)" />
      
      <!-- Decorative elements -->
      <g opacity="0.2">
        <circle cx="200" cy="100" r="50" fill="white" />
        <circle cx="1000" cy="500" r="80" fill="white" />
        <circle cx="900" cy="150" r="40" fill="white" />
        <circle cx="300" cy="500" r="60" fill="white" />
        <circle cx="600" cy="50" r="30" fill="white" />
      </g>
      
      <!-- Connection visualization with X -->
      <g transform="translate(300, 300)">
        <!-- Left node -->
        <circle cx="0" cy="0" r="80" fill="#6366F1" stroke="white" stroke-width="4" />
        <text x="0" y="10" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" fill="white" font-weight="bold">USER</text>
        
        <!-- Right node -->
        <circle cx="600" cy="0" r="80" fill="#6366F1" stroke="white" stroke-width="4" />
        <text x="600" y="10" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" fill="white" font-weight="bold">TARGET</text>
        
        <!-- Broken connection line -->
        <line x1="85" y1="0" x2="250" y2="0" stroke="#EF4444" stroke-width="6" stroke-dasharray="20,10" />
        <line x1="350" y1="0" x2="515" y2="0" stroke="#EF4444" stroke-width="6" stroke-dasharray="20,10" />
        
        <!-- Red X mark -->
        <circle cx="300" cy="0" r="60" fill="#EF4444" />
        <path d="M270,-30 L330,30 M270,30 L330,-30" stroke="white" stroke-width="12" stroke-linecap="round" />
      </g>
      
      <!-- Main heading with glow effect -->
      <text x="600" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" fill="white" font-weight="bold" filter="url(#glow)">No Connection Found</text>
      
      <!-- Subtitle -->
      <text x="600" y="520" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" fill="white">Try connecting with more users to expand your network!</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile('public/static/no-connection.png');
}

export async function generateAllImages(): Promise<void> {
  console.log('Generating all static images...');
  
  // Ensure the static directory exists
  await mkdir('public/static', { recursive: true });
  
  try {
    await Promise.all([
      generateInitialImage(),
      generateSearchImage(),
      generateResultImage(),
      generateShareImage(),
      generateErrorImage(),
      generateSplashImage(),
      generateNoConnectionImage()
    ]);
    
    console.log('✅ All images generated successfully');
  } catch (error) {
    console.error('❌ Error generating images:', error);
    throw error;
  }
}

// Direct execution - no conditional checks
generateAllImages().catch(error => {
  console.error('Failed to generate images:', error);
  process.exit(1);
}); 