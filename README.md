# InTime

A meeting scheduling web application built with React, Node.js, and PostgreSQL. It allows hosts to define event types, set weekly availability schedules, share public booking links, and receive automated email confirmations.

**Live Demo:** [https://intime.namangoyal.dev](https://intime.namangoyal.dev)

---

## How It Works

1. **Create an Event Type**: Define meeting durations (e.g., 15, 30, or 60 minutes), location (Google Meet, in-person), buffer times, and optional custom booking questions.
2. **Set Your Availability**: Configure your weekly schedule (days and working hours) and add date-specific overrides for days off.
3. **Share Your Link**: Send your public booking link (`/book/:username/:eventSlug`) to guests so they can view real-time open slots and choose a time that fits.
4. **Manage Bookings**: View upcoming and past appointments on your dashboard. Both host and guest receive automated email confirmations with Google Calendar links.

---

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, Prisma ORM
- **Database**: PostgreSQL
- **Email Delivery**: Resend
- **Auth**: JWT, optional Google OAuth

---

## Getting Started

### 1. Backend Setup

1. Navigate to the backend directory and install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Create your `.env` file based on the template below:
   ```bash
   # Create backend/.env and populate required variables
   ```

3. Sync the database schema with PostgreSQL:
   ```bash
   npx prisma db push
   ```

4. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend API will run on `http://localhost:5000`.

### 2. Frontend Setup

1. Navigate to the frontend directory and install dependencies:
   ```bash
   cd ../frontend
   npm install
   ```

2. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The application will run on `http://localhost:5173`.

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/intime?schema=public"

# Server & Auth
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:5173
COOKIE_DOMAIN=localhost

# Email Delivery (Resend - Optional in development)
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=InTime <onboarding@resend.dev>

# Google Sign-In (Optional)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:5000
```
