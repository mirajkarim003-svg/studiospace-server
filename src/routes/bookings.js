import { Router } from "express";
import { getDb, toObjectId } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { ah, toMinutes, HttpError } from "../utils.js";

const router = Router();
const bookings = () => getDb().collection("bookings");

// Challenge 2: does [start, end) overlap any CONFIRMED booking of this studio on this date?
async function findClash(studioId, date, startMin, endMin, ignoreId) {
  const confirmed = await bookings().find({ studioId, date, status: "Confirmed" }).toArray();
  return confirmed.find(
    (b) => (!ignoreId || String(b._id) !== String(ignoreId)) && startMin < toMinutes(b.endTime) && endMin > toMinutes(b.startTime)
  );
}

const clashMessage = (clash, date) =>
  `Time slot unavailable: this studio is already confirmed from ${clash.startTime} to ${clash.endTime} on ${date}. Please pick a different time.`;

// Confirmed slots for a studio on a date (shown inside the booking modal)
router.get(
  "/availability",
  ah(async (req, res) => {
    const { studioId, date } = req.query;
    if (!studioId || !/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) return res.json({ booked: [] });
    const confirmed = await bookings().find({ studioId: String(studioId), date: String(date), status: "Confirmed" }).toArray();
    res.json({ booked: confirmed.map((b) => ({ startTime: b.startTime, endTime: b.endTime })) });
  })
);

router.get(
  "/mine",
  requireAuth,
  ah(async (req, res) => {
    const list = await bookings().find({ userEmail: req.user.email }).sort({ createdAt: -1 }).toArray();
    res.json({ bookings: list });
  })
);

// Booking requests received by the logged-in host
router.get(
  "/requests",
  requireAuth,
  ah(async (req, res) => {
    const list = await bookings().find({ hostEmail: req.user.email }).sort({ createdAt: -1 }).toArray();
    res.json({ bookings: list });
  })
);

router.post(
  "/",
  requireAuth,
  ah(async (req, res) => {
    const { studioId, date, startTime, endTime } = req.body || {};
    const notes = String(req.body?.notes || "").trim().slice(0, 500);
    const guests = Number(req.body?.guests);

    const _id = toObjectId(studioId);
    if (!_id) throw new HttpError(400, "Invalid studio.");
    const studio = await getDb().collection("studios").findOne({ _id });
    if (!studio) throw new HttpError(404, "Studio not found.");
    if (studio.ownerEmail === req.user.email) throw new HttpError(403, "You cannot book your own studio.");

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || "")) || Number.isNaN(Date.parse(date))) throw new HttpError(400, "Please choose a valid date.");
    // one day of tolerance so users in other time zones are not rejected wrongly
    const minDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (date < minDate) throw new HttpError(400, "You cannot book a date in the past.");

    const startMin = toMinutes(startTime);
    const endMin = toMinutes(endTime);
    if (startMin === null || endMin === null) throw new HttpError(400, "Please choose valid start and end times.");
    if (endMin <= startMin) throw new HttpError(400, "End time must be after the start time.");
    const hours = (endMin - startMin) / 60;
    if (hours < 1) throw new HttpError(400, "Minimum booking length is 1 hour.");
    if (hours > 12) throw new HttpError(400, "Maximum booking length is 12 hours.");
    if (!Number.isInteger(guests) || guests < 1 || guests > studio.maxCapacity) {
      throw new HttpError(400, `Guests must be between 1 and ${studio.maxCapacity} for this studio.`);
    }

    const clash = await findClash(String(_id), date, startMin, endMin);
    if (clash) throw new HttpError(409, clashMessage(clash, date));

    const subtotal = Math.round(studio.hourlyRate * hours * 100) / 100;
    const doc = {
      studioId: String(_id),
      studioTitle: studio.title,
      studioImage: studio.image,
      studioLocation: studio.location,
      studioCategory: studio.category,
      hostEmail: studio.ownerEmail,
      hostName: studio.ownerName,
      userEmail: req.user.email,
      userName: req.user.name,
      date,
      startTime,
      endTime,
      hours,
      guests,
      notes,
      hourlyRate: studio.hourlyRate,
      securityDeposit: studio.securityDeposit || 0,
      subtotal,
      total: Math.round((subtotal + (studio.securityDeposit || 0)) * 100) / 100,
      status: "Pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await bookings().insertOne(doc);
    res.status(201).json({ message: "Booking request sent!", booking: { ...doc, _id: result.insertedId } });
  })
);

// Change status.
//  - guest: Pending -> Cancelled
//  - host : Pending -> Confirmed | Cancelled,  Confirmed -> Completed | Cancelled
router.patch(
  "/:id/status",
  requireAuth,
  ah(async (req, res) => {
    const _id = toObjectId(req.params.id);
    const booking = _id && (await bookings().findOne({ _id }));
    if (!booking) throw new HttpError(404, "Booking not found.");

    const status = req.body?.status;
    const isGuest = booking.userEmail === req.user.email;
    const isHost = booking.hostEmail === req.user.email;
    if (!isGuest && !isHost) throw new HttpError(403, "Forbidden: this booking is not yours.");

    const set = { status, updatedAt: new Date() };

    if (status === "Cancelled") {
      if (isGuest && booking.status !== "Pending") throw new HttpError(400, "Only pending bookings can be cancelled by the guest.");
      if (isHost && !["Pending", "Confirmed"].includes(booking.status)) throw new HttpError(400, "This booking can no longer be cancelled.");
      set.cancelledBy = isGuest ? "guest" : "host";
    } else if (status === "Confirmed") {
      if (!isHost) throw new HttpError(403, "Only the host can confirm a booking.");
      if (booking.status !== "Pending") throw new HttpError(400, "Only pending bookings can be confirmed.");
      // Re-check collisions at confirmation time, another booking may have been confirmed meanwhile
      const clash = await findClash(booking.studioId, booking.date, toMinutes(booking.startTime), toMinutes(booking.endTime), booking._id);
      if (clash) throw new HttpError(409, clashMessage(clash, booking.date));
    } else if (status === "Completed") {
      if (!isHost) throw new HttpError(403, "Only the host can mark a booking as completed.");
      if (booking.status !== "Confirmed") throw new HttpError(400, "Only confirmed bookings can be completed.");
    } else {
      throw new HttpError(400, "Invalid status.");
    }

    await bookings().updateOne({ _id }, { $set: set });
    res.json({ message: `Booking ${status.toLowerCase()}.`, status });
  })
);

export default router;
