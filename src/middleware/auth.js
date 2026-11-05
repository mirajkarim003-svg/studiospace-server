import jwt from "jsonwebtoken";
import { config } from "../config.js";

export const COOKIE_NAME = "studio_token";
export const SESSION_AUDIENCE = "studiospace-session";
export const EXCHANGE_AUDIENCE = "studiospace-exchange";

// Challenge 1: every protected route runs this. The JWT lives in an HTTPOnly cookie,
// so browser JavaScript can never read it. No valid cookie => 401 Unauthorized.
export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: please log in first." });
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret, { audience: SESSION_AUDIENCE });
    req.user = { email: payload.email, name: payload.name || "Creator", image: payload.image || "" };
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized: your session expired. Please log in again." });
  }
}
