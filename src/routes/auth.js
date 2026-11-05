import { Router } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { COOKIE_NAME, SESSION_AUDIENCE, EXCHANGE_AUDIENCE, requireAuth } from "../middleware/auth.js";
import { ah, HttpError } from "../utils.js";

const router = Router();

const cookieOptions = {
  httpOnly: true, // JavaScript in the browser cannot read this cookie
  secure: config.isProd, // HTTPS only in production
  sameSite: "lax",
  path: "/",
};

// The Next.js app (Better Auth) proves who the user is by sending a short-lived
// "exchange" token signed with the shared JWT_SECRET. We verify it and then set our
// own 7-day session JWT in an HTTPOnly cookie.
router.post(
  "/token",
  ah(async (req, res) => {
    const { token } = req.body || {};
    if (!token) throw new HttpError(400, "Missing token.");
    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret, { audience: EXCHANGE_AUDIENCE });
    } catch {
      throw new HttpError(401, "Unauthorized: invalid or expired login proof.");
    }
    const email = String(payload.email || "").toLowerCase();
    if (!email) throw new HttpError(401, "Unauthorized: no email in token.");

    const user = { email, name: payload.name || "Creator", image: payload.image || "" };
    const session = jwt.sign(user, config.jwtSecret, { audience: SESSION_AUDIENCE, expiresIn: "7d" });
    res.cookie(COOKIE_NAME, session, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ user });
  })
);

router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions);
  res.json({ message: "Logged out." });
});

router.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));

export default router;
