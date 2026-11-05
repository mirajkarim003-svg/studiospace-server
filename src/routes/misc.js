import { Router } from "express";
import { getDb } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { ah, HttpError } from "../utils.js";

const router = Router();

// Numbers for the Dashboard page
router.get(
  "/dashboard",
  requireAuth,
  ah(async (req, res) => {
    const db = getDb();
    const email = req.user.email;
    const [listings, mine, received, wishlist] = await Promise.all([
      db.collection("studios").countDocuments({ ownerEmail: email }),
      db.collection("bookings").find({ userEmail: email }).sort({ createdAt: -1 }).toArray(),
      db.collection("bookings").find({ hostEmail: email }).toArray(),
      db.collection("wishlist").countDocuments({ userEmail: email }),
    ]);
    const count = (list, status) => list.filter((b) => b.status === status).length;
    res.json({
      listings,
      wishlist,
      myBookings: {
        total: mine.length,
        pending: count(mine, "Pending"),
        confirmed: count(mine, "Confirmed"),
        completed: count(mine, "Completed"),
        cancelled: count(mine, "Cancelled"),
      },
      requests: {
        total: received.length,
        pending: count(received, "Pending"),
        earnings: received.filter((b) => ["Confirmed", "Completed"].includes(b.status)).reduce((sum, b) => sum + (b.subtotal || 0), 0),
      },
      recent: mine.slice(0, 5),
    });
  })
);

// Footer newsletter box
router.post(
  "/newsletter",
  ah(async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new HttpError(400, "Please enter a valid email address.");
    await getDb().collection("subscribers").updateOne({ email }, { $setOnInsert: { email, createdAt: new Date() } }, { upsert: true });
    res.status(201).json({ message: "You are subscribed. Watch your inbox for new studios." });
  })
);

export default router;
