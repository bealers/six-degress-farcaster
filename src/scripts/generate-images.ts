import { generateImages } from '../utils/image.js';

async function main() {
  console.log('Generating images...');
  await generateImages();
}

main().catch(console.error); 