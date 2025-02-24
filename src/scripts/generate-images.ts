import { generateImages } from '../utils/image.js';
import { mkdir } from 'fs/promises';

async function main() {
  console.log('Generating images...');
  
  // Ensure the static directory exists
  await mkdir('public/static', { recursive: true });
  
  // Generate all images
  await generateImages();
  
  console.log('Images generated successfully!');
}

main().catch(console.error); 