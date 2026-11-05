import { MongoClient, ObjectId } from "mongodb";
import { config } from "./config.js";

let client;
let db;

export async function connectDB() {
  if (db) return db;
  client = new MongoClient(config.mongoUri);
  await client.connect();
  db = client.db(config.dbName);

  // Indexes keep list/search/booking queries fast
  await Promise.all([
    db.collection("studios").createIndex({ category: 1 }),
    db.collection("studios").createIndex({ ownerEmail: 1 }),
    db.collection("bookings").createIndex({ studioId: 1, date: 1, status: 1 }),
    db.collection("bookings").createIndex({ userEmail: 1 }),
    db.collection("bookings").createIndex({ hostEmail: 1 }),
    db.collection("wishlist").createIndex({ userEmail: 1, studioId: 1 }, { unique: true }),
    db.collection("reviews").createIndex({ studioId: 1 }),
  ]);
  return db;
}

export function getDb() {
  if (!db) throw new Error("Database is not connected yet");
  return db;
}

export async function closeDB() {
  if (client) await client.close();
}

export const toObjectId = (id) => (ObjectId.isValid(id) ? new ObjectId(id) : null);
