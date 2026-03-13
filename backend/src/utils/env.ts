import dotenv from "dotenv";

dotenv.config();

const takeNumber = (raw: string | undefined, fallback: number): number => {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const takeBoolean = (raw: string | undefined, fallback: boolean): boolean => {
  if (raw === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
};

export const settings = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: takeNumber(process.env.PORT, 3000),
  logLevel: process.env.LOG_LEVEL ?? "info",

  dbHost: process.env.DB_HOST ?? "localhost",
  dbPort: takeNumber(process.env.DB_PORT, 5432),
  dbUser: process.env.DB_USERNAME ?? "notes_user",
  dbPassword: process.env.DB_PASSWORD ?? "notes_password",
  dbName: process.env.DB_NAME ?? "notes_db",
  dbLogging: takeBoolean(process.env.DB_LOGGING, false),

  jwtSecret: process.env.JWT_SECRET ?? "change-me-for-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",

  seedOnStart: takeBoolean(process.env.SEED_ON_START, true)
};
