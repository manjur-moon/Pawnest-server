# PawsNest Server

## Project Name
PawsNest Server – Pet Adoption Platform API

## Purpose
This Express.js server powers the PawsNest Pet Adoption Platform. It manages authentication, pet listings, adoption requests, owner-only actions, requester-only actions, and secure MongoDB operations.

## Live API URL
Server Live URL: https://pawnest-server.onrender.com

## Features
- Express.js REST API.
- MongoDB native driver connection.
- Custom email/password authentication.
- Password hashing with bcryptjs.
- Google login verification.
- JWT generation and verification.
- HTTPOnly cookie-based authentication.
- Secure CORS with credentials.
- Pet CRUD APIs.
- Search pets using MongoDB `$regex`.
- Filter pets using MongoDB `$in`.
- Adoption request create, approve, reject, and cancel APIs.
- Owner-only update/delete/approve/reject protection.
- Requester-only cancel protection.

## API Endpoints

### Auth Routes
```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/google
GET  /api/auth/me
POST /api/auth/logout
```

### Pet Routes
```text
GET    /api/pets
GET    /api/pets?search=max
GET    /api/pets?species=Dog
GET    /api/pets?sort=fee-low
GET    /api/pets/featured
GET    /api/pets/:id
POST   /api/pets
PATCH  /api/pets/:id
DELETE /api/pets/:id
GET    /api/pets/owner/my-listings
```

### Adoption Request Routes
```text
POST   /api/requests
GET    /api/requests/my-requests
DELETE /api/requests/:id
GET    /api/requests/pet/:petId
PATCH  /api/requests/:id/approve
PATCH  /api/requests/:id/reject
```

## NPM Packages Used
- express
- mongodb
- bcryptjs
- jsonwebtoken
- cookie-parser
- cors
- dotenv
- google-auth-library
- nodemon

## Environment Variables

Create `.env` file:

```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pawsnest?retryWrites=true&w=majority
JWT_SECRET=replace-with-long-random-secret
CLIENT_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
NODE_ENV=development
```

For production:

```env
MONGODB_URI=your-real-mongodb-atlas-uri
JWT_SECRET=your-long-random-secret
CLIENT_URL=https://your-client-vercel-url.vercel.app
GOOGLE_CLIENT_ID=your-google-client-id
NODE_ENV=production
```

## Local Run Instructions

```bash
npm install
npm run dev
```

The server will run at `http://localhost:5000`.

## Production Start Command

```bash
npm start
```
