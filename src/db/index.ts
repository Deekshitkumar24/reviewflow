import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema/index';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is missing.');
}

// Ensure ?pgbouncer=true or no pooling based on Neon connection URL
// Usually the standard connection pool url is provided by Neon.
const sql = neon(process.env.DATABASE_URL);

// Export the singleton DB instance
export const db = drizzle(sql, { schema });
