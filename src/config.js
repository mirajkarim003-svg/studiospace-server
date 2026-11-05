import dotenv from "dotenv";
dotenv.config({ quiet: true });

const required = ["MONGODB_URI", "JWT_SECRET"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`\n❌ Missing environment variables: ${missing.join(", ")}`);
  console.error("   Copy .env.example to .env and fill the values in.\n");
  process.exit(1);
}

export const config = {
  port: Number(process.env.PORT) || 5000,
  isProd: process.env.NODE_ENV === "production",
  mongoUri: process.env.MONGODB_URI,
  dbName: process.env.DB_NAME || "studiospace",
  jwtSecret: process.env.JWT_SECRET,
  clientUrls: (process.env.CLIENT_URL || "http://localhost:3000")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean),
};
