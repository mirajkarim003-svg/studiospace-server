# StudioSpace Server

This is the backend of StudioSpace, a platform where people can find and book creative studios.

### Features
- User authentication with JWT and HTTPOnly cookies
- Studio listing, adding, updating and deleting
- Studio search, filtering and reviews
- Booking system with availability checking
- Prevents double booking
- Wishlist and dashboard
- MongoDB database integration

### Tech Stack
- Express.js
- MongoDB
- Node.js
- Better Auth
- JWT

### Run Locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file from `.env.example` and add your MongoDB URI and JWT secret.

3. Seed demo data:

   ```bash
   npm run seed
   ```

4. Start the server:

   ```bash
   npm run dev
   ```

   Server runs at `http://localhost:5000`.

### Demo Account

- Email: examiner@studiospace.com
- Password: Examiner123

### Deployment

The server is deployed on Render.

Set the environment variables from `.env.example` in Render before deployment.
