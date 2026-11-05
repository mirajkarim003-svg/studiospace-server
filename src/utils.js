export const CATEGORIES = ["Photo Studio", "Film Stage", "Podcast Lounge", "Music Suite", "Workshop"];
export const BOOKING_STATUSES = ["Pending", "Confirmed", "Completed", "Cancelled"];

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Express 4 does not catch errors thrown inside async handlers, so we wrap them.
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const isUrl = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

// "14:30" -> 870 (minutes since midnight). Returns null when the format is wrong.
export const toMinutes = (t) => {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(t || "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
