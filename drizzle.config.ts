import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // drizzle-kit needs the real DB connection to push. 
    // Usually recommended to use the direct (non-pooled) URL for migrations
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
  verbose: true,
  strict: true,
});
