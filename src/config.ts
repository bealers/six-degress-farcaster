import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['NEYNAR_API_KEY'] as const;
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  hostUrl: process.env.HOST_URL || 'http://localhost:3000',
  neynar: {
    apiKey: process.env.NEYNAR_API_KEY!,
    rpcUrl: process.env.NEYNAR_RPC_URL,
    webhookUrl: process.env.NEYNAR_WEBHOOK_URL,
    hubUrl: process.env.NEYNAR_HUB_URL
  },
  database: {
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  },
  isDev: process.env.NODE_ENV !== 'production'
} as const; 