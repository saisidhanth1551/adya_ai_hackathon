import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Ensure SENDGRID_API_KEY is set
if (!process.env.SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY environment variable is required for tests. See README.md for setup instructions.');
}
