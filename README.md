# StudioSpace (server)

Express + MongoDB REST API for StudioSpace. Protected routes use a JWT stored in an **HTTPOnly cookie** and answer `401 Unauthorized` without it.

## Endpoints

| Method | Route | Access |
| --- | --- | --- |
| POST | /api/auth/token, /api/auth/logout | exchange login proof for cookie / clear cookie |
| GET | /api/studios (search, category, price, sort, page, featured) | public |
| GET | /api/studios/:id, /api/studios/:id/reviews, /api/studios/stats/categories | public |
| POST / PUT / DELETE | /api/studios, /api/studios/:id | owner only (JWT) |
| GET | /api/studios/mine | JWT |
| POST | /api/studios/:id/reviews | JWT |
| GET | /api/bookings/availability | public |
| POST | /api/bookings | JWT (rejects overlaps with Confirmed bookings, 409) |
| GET | /api/bookings/mine, /api/bookings/requests | JWT |
| PATCH | /api/bookings/:id/status | guest cancels Pending, host confirms / completes / cancels |
| GET / POST / DELETE | /api/wishlist | JWT |
| GET | /api/dashboard | JWT |
| POST | /api/newsletter | public |

## Run locally

```bash
npm install
cp .env.example .env     # fill MONGODB_URI and JWT_SECRET
npm run seed             # 12 demo studios, reviews and bookings
npm run dev              # http://localhost:5000
```

`JWT_SECRET` must be identical in the client `.env.local`. Use `npm run seed:reset` to wipe and reseed.

## Deploy (Render)

New Web Service, root directory `server`, build `npm install`, start `npm start`, add the variables from `.env.example` (`NODE_ENV=production`, `CLIENT_URL` = your Vercel URL).
