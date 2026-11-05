import { Router } from "express";
import { getDb, toObjectId } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { ah, HttpError } from "../utils.js";

const router = Router();
router.use(requireAuth);
const wishlist = () => getDb().collection("wishlist");

router.get(
  "/ids",
  ah(async (req, res) => {
    const items = await wishlist().find({ userEmail: req.user.email }).toArray();
    res.json({ ids: items.map((i) => i.studioId) });
  })
);

router.get(
  "/",
  ah(async (req, res) => {
    const items = await wishlist().find({ userEmail: req.user.email }).sort({ createdAt: -1 }).toArray();
    const objectIds = items.map((i) => toObjectId(i.studioId)).filter(Boolean);
    const found = await getDb().collection("studios").find({ _id: { $in: objectIds } }).toArray();
    const byId = new Map(found.map((s) => [String(s._id), s]));
    res.json({ studios: items.map((i) => byId.get(i.studioId)).filter(Boolean) });
  })
);

router.post(
  "/:studioId",
  ah(async (req, res) => {
    const _id = toObjectId(req.params.studioId);
    const studio = _id && (await getDb().collection("studios").findOne({ _id }));
    if (!studio) throw new HttpError(404, "Studio not found.");
    await wishlist().updateOne(
      { userEmail: req.user.email, studioId: String(_id) },
      { $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    res.status(201).json({ message: "Saved to wishlist." });
  })
);

router.delete(
  "/:studioId",
  ah(async (req, res) => {
    await wishlist().deleteOne({ userEmail: req.user.email, studioId: req.params.studioId });
    res.json({ message: "Removed from wishlist." });
  })
);

export default router;
