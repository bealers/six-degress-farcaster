import sharp from 'sharp';
import type { ConnectionPath } from '../types/index.js';

export async function generateConnectionImage(path: ConnectionPath): Promise<Buffer> {
  // TODO: Implement image generation
  return Buffer.from('');
}

export async function generateInitialImage() {
  const width = 1200;
  const height = 630;
  
  // Create a white text SVG
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#191919"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="system-ui" 
        font-size="60" 
        fill="white" 
        text-anchor="middle" 
        dominant-baseline="middle"
      >
        Six Degrees of Farcaster
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
      <rect width="100%" height="100%" fill="#000000"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="system-ui" 
        font-size="24" 
        fill="white" 
        text-anchor="middle" 
        dominant-baseline="middle"
      >
        Loading...
      </text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile('public/static/splash.png');
}

export async function generateSearchImage() {
  const width = 1200;
  const height = 630;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#191919"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="system-ui" 
        font-size="48" 
        fill="white" 
        text-anchor="middle" 
        dominant-baseline="middle"
      >
        Enter the second username to find a connection
      </text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile('public/static/search.png');
}

export async function generateResultImage() {
  const width = 1200;
  const height = 630;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#191919"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="system-ui" 
        font-size="48" 
        fill="white" 
        text-anchor="middle" 
        dominant-baseline="middle"
      >
        Finding connection...
      </text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile('public/static/result.png');
}

export async function generateImages() {
  await generateInitialImage();
  await generateSearchImage();
  await generateResultImage();
  await generateSplashImage();
  console.log('Images generated successfully!');
} 