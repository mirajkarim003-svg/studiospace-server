import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { config } from "./config.js";
import { connectDB } from "./db.js";
import authRoutes from "./routes/auth.js";
import studioRoutes from "./routes/studios.js";
import bookingRoutes from "./routes/bookings.js";
import wishlistRoutes from "./routes/wishlist.js";
import miscRoutes from "./routes/misc.js";

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: config.clientUrls, credentials: true }));
app.use(express.json({ limit: "200kb" }));
app.use(cookieParser());

app.get("/", (req, res) => res.json({ name: "StudioSpace API", status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/studios", studioRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api", miscRoutes);

app.use((req, res) => res.status(404).json({ message: "Route not found." }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ message: err.status ? err.message : "Something went wrong on the server." });
});

connectDB()
  .then(() => app.listen(config.port, () => console.log(`✅ StudioSpace API running on port ${config.port}`)))
  .catch((err) => {
    console.error("❌ Could not connect to MongoDB:", err.message);
    process.exit(1);
  });
