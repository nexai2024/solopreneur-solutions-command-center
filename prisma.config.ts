import { config } from "dotenv";

config();

import { defineConfig } from "prisma/config";

function getDatabaseUrl(): string {
  // Schema push / migrations need a direct Postgres URL (not PgBouncer transaction mode).
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Missing DATABASE_URL in .env. Copy .env.example, set your Postgres URL, and save the file."
    );
  }
  return url;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: getDatabaseUrl(),
  },
});
