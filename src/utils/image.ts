import sharp from 'sharp';
import type { ConnectionPath } from '../types/index.js';

export async function generateConnectionImage(path: ConnectionPath): Promise<Buffer> {
  // TODO: Implement image generation
  return Buffer.from('');
}

export async function generateInitialImage() {
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

export async function generateSplashImage() {
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

export async function generateSearchImage() {
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

export async function generateResultImage() {
  const svg = `
    <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="800" fill="#191919"/>
      <text x="50%" y="250" text-anchor="middle" font-family="system-ui" font-size="48" font-weight="bold" fill="white">
        Connection Found!
      </text>
      <text x="50%" y="320" text-anchor="middle" font-family="system-ui" font-size="28" fill="#E0E0E0">
        Here's how you're connected in the social graph
      </text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile('public/static/result.png');
}

export async function generateShareImage() {
  const svg = `
    <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="800" fill="#191919"/>
      <text x="50%" y="250" text-anchor="middle" font-family="system-ui" font-size="48" font-weight="bold" fill="white">
        Six Degrees of Farcaster
      </text>
      <text x="50%" y="320" text-anchor="middle" font-family="system-ui" font-size="28" fill="#E0E0E0">
        I discovered my connection! What's yours?
      </text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile('public/static/share.png');
}

export async function generateErrorImage() {
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

export async function generateImages() {
  await generateInitialImage();
  await generateSearchImage();
  await generateResultImage();
  await generateShareImage();
  await generateErrorImage();
  await generateSplashImage();
  console.log('Images generated successfully!');
} 