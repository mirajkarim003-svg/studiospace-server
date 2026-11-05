import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
// Fills the database with realistic demo studios, reviews and bookings.
//   npm run seed          -> only seeds when the studios collection is empty
//   npm run seed:reset    -> wipes studios/reviews/bookings/wishlist and seeds again
import { connectDB, closeDB } from "./db.js";

// This must match the demo account created by the client script (npm run seed:demo-user)
const DEMO_EMAIL = "examiner@studiospace.com";
const DEMO_NAME = "Demo Examiner";
const U = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=80`;

const IMAGES = {
  "Photo Studio": [U("photo-1516035069371-29a1b244cc32"), U("photo-1492691527719-9d1e07e534b4"), U("photo-1471341971476-ae15ff5dd4ea")],
  "Film Stage": [U("photo-1485846234645-a62644f84728"), U("photo-1536440136628-849c177e76a1"), U("photo-1492619375914-88005aa9e8fb")],
  "Podcast Lounge": [U("photo-1478737270239-2f02b77fc618"), U("photo-1589903308904-1010c2294adc"), U("photo-1590602847861-f357a9332bbc")],
  "Music Suite": [U("photo-1598488035139-bdbb2231ce04"), U("photo-1511379938547-c1f69419868d"), U("photo-1520523839897-bd0b52f945a0")],
  Workshop: [U("photo-1513364776144-60967b0f800f"), U("photo-1460661419201-fd4cecdf8a8b"), U("photo-1452860606245-08befc0ff44b")],
};

const hosts = {
  demo: { email: DEMO_EMAIL, name: DEMO_NAME },
  maya: { email: "maya.ortiz@studiohosts.test", name: "Maya Ortiz" },
  jonas: { email: "jonas.berg@studiohosts.test", name: "Jonas Berg" },
  priya: { email: "priya.nair@studiohosts.test", name: "Priya Nair" },
  theo: { email: "theo.baker@studiohosts.test", name: "Theo Baker" },
};

// [host, category, title, rate, deposit, capacity, location, amenities, overview, imageOffset]
const rows = [
  ["demo", "Photo Studio", "Northlight Cyc Wall Studio", 65, 150, 12, "214 Mercer Street, Brooklyn, NY",
    ["Cyclorama wall", "Strobe lighting kit", "Backdrops", "Makeup station", "Wi-Fi", "Air conditioning"],
    "A 1,400 sq ft white cyclorama wall flooded with north-facing daylight. Comes with four strobe heads, modifiers and three paper backdrops, so you can walk in with a camera and walk out with a finished lookbook. Freight elevator access makes loading in furniture easy."],
  ["demo", "Podcast Lounge", "Velvet Room Podcast Lounge", 40, 60, 6, "88 Alder Lane, Austin, TX",
    ["Soundproofing", "Microphones", "Mixing console", "Wi-Fi", "Kitchenette", "Air conditioning"],
    "A cozy, acoustically treated lounge with four broadcast mics on boom arms, a mixing desk and a sofa set that keeps guests relaxed. Ideal for interview shows, panel recordings and live-streamed episodes. Coffee and sparkling water are included."],
  ["demo", "Music Suite", "Harbor Sound Recording Suite", 85, 200, 8, "12 Quay Road, Seattle, WA",
    ["Soundproofing", "Mixing console", "Microphones", "Piano", "Drum kit", "Green room"],
    "A two-room recording suite with a live room, an isolation booth and a control room built around an analog console. Grand piano and a tuned drum kit are on site. Bring your band or book an engineer through the host for an additional fee."],
  ["maya", "Photo Studio", "Golden Hour Loft", 55, 100, 10, "540 Sunset Blvd, Los Angeles, CA",
    ["Natural light", "Backdrops", "Props", "Makeup station", "Parking", "Wi-Fi"],
    "A sun-drenched loft with 14-foot windows and warm wood floors, popular for portraits, lifestyle shoots and small product campaigns. A prop closet with chairs, plants and textiles is included in your booking."],
  ["maya", "Film Stage", "Backlot Sound Stage A", 180, 500, 40, "1200 Studio Way, Burbank, CA",
    ["Soundproofing", "Loading dock", "Green room", "Cyclorama wall", "Parking", "Restroom"],
    "A 3,000 sq ft soundproofed stage with a lighting grid, 20-foot ceilings and a drive-in loading dock. Two production offices and a green room sit right next door, which makes it suitable for commercials, short films and music videos."],
  ["jonas", "Podcast Lounge", "Tin Can Audio Booth", 28, 40, 3, "7 Linden Court, Chicago, IL",
    ["Soundproofing", "Microphones", "Wi-Fi", "Air conditioning"],
    "A compact, fully treated booth for solo creators and two-person shows. Two large-diaphragm condenser mics, pop filters and a monitoring rig are ready to go. Plug in your laptop and press record."],
  ["jonas", "Music Suite", "Basement Tapes Rehearsal Rooms", 35, 50, 7, "310 Mill Street, Portland, OR",
    ["Drum kit", "Soundproofing", "Wi-Fi", "Parking", "Air conditioning"],
    "Three rehearsal rooms with backline amps, a full drum kit and a PA system. Priced for working bands who need to run the set twice before the weekend gig. Earplugs are available at the front desk."],
  ["priya", "Workshop", "Clay & Canvas Art Workshop", 30, 75, 16, "46 Jasmine Road, San Diego, CA",
    ["Natural light", "Kitchenette", "Restroom", "Wi-Fi", "Props"],
    "A bright studio with long worktables, a pottery wheel corner and easels for ten painters. Washable floors mean no stress about spills. Great for classes, team events and independent artists who need room to spread out."],
  ["priya", "Film Stage", "Greenscreen Box", 95, 250, 18, "9 Foundry Park, Atlanta, GA",
    ["Cyclorama wall", "Strobe lighting kit", "Loading dock", "Wi-Fi", "Air conditioning"],
    "A seamless green cyclorama with a dedicated lighting setup for clean keying, plus a monitor station for the director. A great fit for virtual-production tests, creator sketches and product demos."],
  ["theo", "Photo Studio", "Concrete & Chrome Product Studio", 48, 80, 6, "73 Dock Street, Philadelphia, PA",
    ["Strobe lighting kit", "Backdrops", "Wi-Fi", "Air conditioning", "Props"],
    "A tabletop-friendly studio with infinity sweeps, light tents and macro rails. Built for e-commerce and product photographers who need consistent, repeatable lighting for hundreds of items per day."],
  ["theo", "Workshop", "Print & Press Collective", 25, 60, 14, "18 Ink Alley, Minneapolis, MN",
    ["Natural light", "Restroom", "Kitchenette", "Wi-Fi"],
    "A community print shop with letterpress, screen-printing frames and a large exposure unit. Book the room for an afternoon of poster printing or run a small workshop for up to fourteen people."],
  ["maya", "Podcast Lounge", "Late Night Radio Room", 45, 75, 5, "301 Bourbon Row, New Orleans, LA",
    ["Soundproofing", "Microphones", "Mixing console", "Green room", "Wi-Fi"],
    "A dimly lit radio room with warm acoustic panels, vintage ribbon mics and a four-channel mixer. Perfect for storytelling shows and music talk programs with guests who want a proper studio feel."],
];

const reviewPool = [
  [5, "Everything was exactly as described. The host was quick to reply and the space was spotless."],
  [5, "Loved the light here. We wrapped our shoot an hour early because setup was so simple."],
  [4, "Great value and easy access. Wi-Fi dipped once, but the host fixed it within minutes."],
  [5, "Professional setup and super comfortable for guests. We have already rebooked."],
  [4, "Solid studio with plenty of space. Parking is a little tight, so arrive early with gear."],
  [5, "The sound treatment is excellent. Our audio needed almost no cleanup in post."],
];
const reviewers = ["Ava Thompson", "Liam Chen", "Sofia Alvarez", "Noah Patel", "Emma Wilson", "Leo Martin"];

const dayStr = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

async function run() {
  const db = await connectDB();
  const reset = process.argv.includes("--reset");
  if (reset) {
    await Promise.all(["studios", "reviews", "bookings", "wishlist"].map((c) => db.collection(c).deleteMany({})));
    console.log("🧹 Cleared studios, reviews, bookings and wishlist");
  } else if ((await db.collection("studios").countDocuments()) > 0) {
    console.log("ℹ️  Studios already exist. Use `npm run seed:reset` to wipe and reseed.");
    return;
  }

  const studios = rows.map(([hostKey, category, title, hourlyRate, securityDeposit, maxCapacity, location, amenities, overview], i) => {
    const imgs = IMAGES[category];
    const host = hosts[hostKey];
    return {
      title, category, hourlyRate, securityDeposit, maxCapacity, location, amenities, overview,
      image: imgs[i % 3],
      gallery: [imgs[(i + 1) % 3], imgs[(i + 2) % 3]],
      ownerEmail: host.email,
      ownerName: host.name,
      ownerPhoto: "",
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(Date.now() - i * 2 * 86400000),
      updatedAt: new Date(),
    };
  });
  const { insertedIds } = await db.collection("studios").insertMany(studios);
  const ids = Object.values(insertedIds).map(String);
  console.log(`🎬 Inserted ${ids.length} studios`);

  // Reviews: 3 to 5 reviews per studio, rating is calculated from them
  const reviews = [];
  ids.forEach((studioId, i) => {
    const n = 3 + (i % 3);
    let sum = 0;
    for (let k = 0; k < n; k++) {
      const [rating, comment] = reviewPool[(i + k) % reviewPool.length];
      sum += rating;
      reviews.push({
        studioId, rating, comment,
        userEmail: `${reviewers[(i + k) % reviewers.length].split(" ")[0].toLowerCase()}@creators.test`,
        userName: reviewers[(i + k) % reviewers.length],
        userPhoto: "",
        createdAt: new Date(Date.now() - (k + 1) * 5 * 86400000),
        updatedAt: new Date(),
      });
    }
    studios[i].rating = Math.round((sum / n) * 10) / 10;
    studios[i].reviewCount = n;
  });
  await db.collection("reviews").insertMany(reviews);
  await Promise.all(studios.map((s, i) => db.collection("studios").updateOne({ _id: insertedIds[i] }, { $set: { rating: s.rating, reviewCount: s.reviewCount } })));
  console.log(`⭐ Inserted ${reviews.length} reviews`);

  // Bookings: some requests for the demo host's studios + a couple made by the demo user
  const mk = (studioIdx, who, date, startTime, endTime, status, guests = 2) => {
    const s = studios[studioIdx];
    const hours = (Number(endTime.slice(0, 2)) * 60 + Number(endTime.slice(3)) - Number(startTime.slice(0, 2)) * 60 - Number(startTime.slice(3))) / 60;
    const subtotal = s.hourlyRate * hours;
    return {
      studioId: ids[studioIdx], studioTitle: s.title, studioImage: s.image, studioLocation: s.location, studioCategory: s.category,
      hostEmail: s.ownerEmail, hostName: s.ownerName,
      userEmail: who.email, userName: who.name,
      date, startTime, endTime, hours, guests, notes: "", hourlyRate: s.hourlyRate, securityDeposit: s.securityDeposit,
      subtotal, total: subtotal + s.securityDeposit, status,
      createdAt: new Date(), updatedAt: new Date(),
    };
  };
  const ava = { email: "ava@creators.test", name: "Ava Thompson" };
  const liam = { email: "liam@creators.test", name: "Liam Chen" };
  const demo = hosts.demo;
  const bookings = [
    mk(0, ava, dayStr(4), "14:00", "17:00", "Confirmed", 4),   // confirmed slot on the demo host's studio (try booking 15:00-16:00 to see the clash error)
    mk(0, liam, dayStr(6), "10:00", "12:00", "Pending"),
    mk(1, ava, dayStr(5), "18:00", "20:00", "Pending"),
    mk(3, demo, dayStr(9), "09:00", "12:00", "Pending", 3),   // demo user booked someone else's studio
    mk(5, demo, dayStr(-12), "13:00", "15:00", "Completed", 2),
    mk(7, demo, dayStr(11), "11:00", "15:00", "Confirmed", 6),
  ];
  await db.collection("bookings").insertMany(bookings);
  console.log(`📅 Inserted ${bookings.length} bookings`);
  console.log(`\n✅ Seed complete. Demo host account: ${DEMO_EMAIL}`);
}

run().catch((e) => { console.error("Seed failed:", e.message); process.exitCode = 1; }).finally(closeDB);
