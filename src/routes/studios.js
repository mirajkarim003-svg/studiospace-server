import { Router } from "express";
import { getDb, toObjectId } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { ah, escapeRegex, isUrl, CATEGORIES, HttpError } from "../utils.js";

const router = Router();
const studios = () => getDb().collection("studios");

// Checks the body of POST/PUT and returns a clean object (or throws a 400 with the reasons)
function validateStudio(body = {}) {
  const errors = [];
  const title = String(body.title || "").trim();
  const category = String(body.category || "").trim();
  const location = String(body.location || "").trim();
  const overview = String(body.overview || "").trim();
  const image = String(body.image || "").trim();
  const hourlyRate = Number(body.hourlyRate);
  const securityDeposit = Number(body.securityDeposit ?? 0);
  const maxCapacity = Number(body.maxCapacity);

  if (title.length < 3 || title.length > 80) errors.push("Title must be 3 to 80 characters.");
  if (!CATEGORIES.includes(category)) errors.push("Please choose a valid category.");
  if (!(hourlyRate > 0 && hourlyRate <= 5000)) errors.push("Hourly rate must be between $1 and $5000.");
  if (!(securityDeposit >= 0 && securityDeposit <= 20000)) errors.push("Security deposit must be $0 or more.");
  if (!(Number.isInteger(maxCapacity) && maxCapacity >= 1 && maxCapacity <= 500)) errors.push("Max capacity must be a whole number from 1 to 500.");
  if (location.length < 3) errors.push("Please enter the studio location or address.");
  if (!isUrl(image)) errors.push("Please provide a valid main image URL.");
  if (overview.length < 20) errors.push("Overview must be at least 20 characters.");

  const gallery = (Array.isArray(body.gallery) ? body.gallery : [])
    .map((u) => String(u).trim())
    .filter(isUrl)
    .slice(0, 8);
  const amenities = [...new Set((Array.isArray(body.amenities) ? body.amenities : []).map((a) => String(a).trim()).filter((a) => a && a.length <= 40))].slice(0, 20);

  if (errors.length) throw new HttpError(400, errors.join(" "));
  return { title, category, hourlyRate, securityDeposit, maxCapacity, location, image, gallery, amenities, overview };
}

// GET /api/studios?search=&category=&minPrice=&maxPrice=&sort=&page=&limit=&featured=true
router.get(
  "/",
  ah(async (req, res) => {
    const { search = "", category = "", minPrice, maxPrice, sort = "newest", featured } = req.query;
    const filter = {};
    if (String(search).trim()) {
      const rx = new RegExp(escapeRegex(String(search).trim()), "i");
      filter.$or = [{ title: rx }, { location: rx }, { category: rx }, { amenities: rx }];
    }
    if (category && category !== "all") filter.category = String(category);
    const price = {};
    if (minPrice && Number(minPrice) >= 0) price.$gte = Number(minPrice);
    if (maxPrice && Number(maxPrice) > 0) price.$lte = Number(maxPrice);
    if (Object.keys(price).length) filter.hourlyRate = price;

    const sorts = {
      newest: { createdAt: -1, _id: -1 },
      rating: { rating: -1, reviewCount: -1, _id: -1 },
      priceLow: { hourlyRate: 1, _id: 1 },
      priceHigh: { hourlyRate: -1, _id: -1 },
    };

    // Home page: top rated first, newest as tie-breaker, exactly 6 cards (.limit(6))
    if (featured === "true") {
      const list = await studios().find(filter).sort({ rating: -1, createdAt: -1 }).limit(6).toArray();
      return res.json({ studios: list, total: list.length, page: 1, pages: 1 });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 9, 1), 30);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const total = await studios().countDocuments(filter);
    const list = await studios()
      .find(filter)
      .sort(sorts[sort] || sorts.newest)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();
    res.json({ studios: list, total, page, pages: Math.max(Math.ceil(total / limit), 1) });
  })
);

// Number of studios per category (used by the Home category cards)
router.get(
  "/stats/categories",
  ah(async (req, res) => {
    const rows = await studios().aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]).toArray();
    res.json({ counts: Object.fromEntries(rows.map((r) => [r._id, r.count])) });
  })
);

// Studios owned by the logged-in user (ownerEmail match)
router.get(
  "/mine",
  requireAuth,
  ah(async (req, res) => {
    const list = await studios().find({ ownerEmail: req.user.email }).sort({ createdAt: -1 }).toArray();
    res.json({ studios: list });
  })
);

router.get(
  "/:id",
  ah(async (req, res) => {
    const _id = toObjectId(req.params.id);
    const studio = _id && (await studios().findOne({ _id }));
    if (!studio) throw new HttpError(404, "Studio not found.");
    res.json({ studio });
  })
);

// CREATE (protected)
router.post(
  "/",
  requireAuth,
  ah(async (req, res) => {
    const data = validateStudio(req.body);
    const doc = {
      ...data,
      // Owner info always comes from the verified token, never from the request body
      ownerEmail: req.user.email,
      ownerName: req.user.name,
      ownerPhoto: req.user.image,
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await studios().insertOne(doc);
    res.status(201).json({ message: "Studio listed successfully.", studio: { ...doc, _id: result.insertedId } });
  })
);

// UPDATE (protected, owner only)
router.put(
  "/:id",
  requireAuth,
  ah(async (req, res) => {
    const _id = toObjectId(req.params.id);
    const existing = _id && (await studios().findOne({ _id }));
    if (!existing) throw new HttpError(404, "Studio not found.");
    if (existing.ownerEmail !== req.user.email) throw new HttpError(403, "Forbidden: you can only edit your own listings.");
    const data = validateStudio(req.body);
    await studios().updateOne({ _id }, { $set: { ...data, updatedAt: new Date() } });
    res.json({ message: "Studio updated successfully." });
  })
);

// DELETE (protected, owner only)
router.delete(
  "/:id",
  requireAuth,
  ah(async (req, res) => {
    const _id = toObjectId(req.params.id);
    const existing = _id && (await studios().findOne({ _id }));
    if (!existing) throw new HttpError(404, "Studio not found.");
    if (existing.ownerEmail !== req.user.email) throw new HttpError(403, "Forbidden: you can only delete your own listings.");
    const id = String(_id);
    const db = getDb();
    await studios().deleteOne({ _id });
    await Promise.all([
      db.collection("reviews").deleteMany({ studioId: id }),
      db.collection("wishlist").deleteMany({ studioId: id }),
      db.collection("bookings").updateMany(
        { studioId: id, status: { $in: ["Pending", "Confirmed"] } },
        { $set: { status: "Cancelled", cancelledBy: "host", cancelReason: "Listing removed by host", updatedAt: new Date() } }
      ),
    ]);
    res.json({ message: "Studio deleted." });
  })
);

// ---------- Reviews ----------
router.get(
  "/:id/reviews",
  ah(async (req, res) => {
    const reviews = await getDb().collection("reviews").find({ studioId: req.params.id }).sort({ createdAt: -1 }).limit(50).toArray();
    res.json({ reviews });
  })
);

router.post(
  "/:id/reviews",
  requireAuth,
  ah(async (req, res) => {
    const _id = toObjectId(req.params.id);
    const studio = _id && (await studios().findOne({ _id }));
    if (!studio) throw new HttpError(404, "Studio not found.");
    if (studio.ownerEmail === req.user.email) throw new HttpError(403, "You cannot review your own studio.");

    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || "").trim();
    if (!(Number.isInteger(rating) && rating >= 1 && rating <= 5)) throw new HttpError(400, "Please pick a rating from 1 to 5 stars.");
    if (comment.length < 5 || comment.length > 500) throw new HttpError(400, "Review must be 5 to 500 characters.");

    const reviews = getDb().collection("reviews");
    const studioId = String(_id);
    await reviews.updateOne(
      { studioId, userEmail: req.user.email },
      {
        $set: { rating, comment, userName: req.user.name, userPhoto: req.user.image, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    // Recalculate the studio's average rating from all its reviews
    const all = await reviews.find({ studioId }).project({ rating: 1 }).toArray();
    const avg = all.reduce((sum, r) => sum + r.rating, 0) / all.length;
    await studios().updateOne({ _id }, { $set: { rating: Math.round(avg * 10) / 10, reviewCount: all.length } });
    res.status(201).json({ message: "Thanks! Your review is live." });
  })
);

export default router;
