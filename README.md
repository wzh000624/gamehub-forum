# GameHub Game Forum Login and Message Board

This project is mainly aimed at college game enthusiasts, aiming to build a lightweight campus game exchange platform. Users can complete registration and login, browse forum content, post comments, and participate in interactive discussions, thus forming a convenient gaming community environment.

## Tech Stack

- Next.js App Router
- Supabase Auth
- Supabase PostgreSQL
- CheapShark public API
- Tailwind CSS
- lucide-react icons

## Project Structure

```text
app/
  login/              Sign-in page
  register/           Registration page
  forum/              Forum board and post creation
  forgot-password/    Reserved password recovery page
  auth/callback/      Supabase email confirmation callback
components/
  ui/                 Base UI components
lib/
  supabase/           Supabase clients
  types.ts            Data types
supabase/
  schema.sql          Database tables, triggers, and RLS policies
```

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file:

```bash
cp .env.example .env.local
```

3. Fill in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=your Supabase publishable key
```

4. Run this file in the Supabase SQL Editor:

```text
supabase/schema.sql
```

5. Start the project:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

6.Upload the project to the cloud:

The project has been uploaded to the Vercel cloud,direct access [https://vercel.com/wzh000624s-projects/gamehub-forum](https://gamehub-forum.vercel.app/login) You can enter the project now.

## Supabase Setup Notes

- Set the Authentication Site URL to local `http://localhost:3000` or your deployed domain.
- Recommended Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://your-domain/auth/callback`
- If you want users to enter the forum immediately after signing up, disable email confirmation in Supabase Auth settings during development.

## Implemented Features

- Email and password sign-in
- New user registration
- Real-time form validation
- Redirect to the forum after sign-in
- Create posts with titles up to 50 characters and content up to 1000 characters
- Post list sorted by newest first
- Reserved likes field
- User sign out
- Live game deal cards powered by the CheapShark public API
- User avatar upload
- Users can delete their own posts by themselves
- Hot Like Post Ranking

## External API Integration

The forum page includes a `Live Game Deals` panel. It fetches current Steam game deal data from the CheapShark public API:

```text
https://www.cheapshark.com/api/1.0/deals
```

Deal cards link through CheapShark redirect URLs, matching CheapShark usage guidance for deal traffic.


