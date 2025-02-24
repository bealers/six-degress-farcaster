import { serve } from '@hono/node-server';
import { config } from 'dotenv';
import frame from './api/frame.js';

// Load environment variables
config();

const port = process.env.PORT || 3000;

console.log(`Server is running on port ${port}`);

serve({
  fetch: frame.fetch,
  port: Number(port)
}); 