import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/index';

const connectionUrl = process.env.DATABASE_URL;
if (!connectionUrl) {
  throw new Error('DATABASE_URL environment variable is missing.');
}

// Use node-postgres Pool instead of Neon HTTP driver.
// The Neon HTTP driver relies on fetch(), which breaks under
// Next.js Turbopack on Windows ("TypeError: fetch failed").
// A standard TCP pool connection works reliably everywhere.
const pool = new Pool({
  connectionString: connectionUrl,
  max: 10,
});

// Export the singleton DB instance
export const db = drizzle(pool, { schema });
