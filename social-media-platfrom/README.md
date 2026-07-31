# Media Show

A calm, ad-free, safety-first social platform for kids & teenagers.

## Stack
- React (Vite) + Tailwind CSS — frontend (`/src`)
- Node.js/Express + PostgreSQL-ready — backend (`/backend`)
- Smart Ethical Shield — placeholder moderation architecture (`services/moderationService.js` on both ends)

## Run the frontend
```bash
npm install
npm run dev
```
Visit http://localhost:5173 — sign up (any email/password + age) to enter the app.

## Cloudflare Pages deployment

The repository root is configured for Cloudflare Pages. Use `npm run build:cloudflare`
with `social-media-platfrom/dist` as the build output directory. Cloudflare Pages
automatically applies SPA fallback behavior when the output has no top-level
`404.html`, so React Router routes work without a provider-specific redirects file.

Set `VITE_API_URL` in the Cloudflare Pages build environment to the public HTTPS
Express API URL ending in `/api`. For direct CLI deployment, run
`npm run deploy:cloudflare` from the repository root.

## Run the backend (optional, API scaffold only)
```bash
cd backend
npm install
cp .env.example .env   # set DATABASE_URL, JWT_SECRET
npm run dev
```

## Production authentication configuration

Google sign-in is completed by the Express API; the browser must never treat a
Firebase ID token as the application's own session token.

For Render and Supabase:

1. In Supabase, open **Connect**, select **Session pooler**, and copy the entire
   URI. Do not combine the direct host with pooler credentials. The expected
   shape is
   `postgresql://postgres.<project-ref>:<encoded-password>@aws-0-<region>.pooler.supabase.com:5432/postgres`.
2. Set Render `DATABASE_URL` to that complete URI. URL-encode reserved password
   characters such as `@`, `:`, `/`, `?`, and `#`.
3. Set `FIREBASE_SERVICE_ACCOUNT` to the complete one-line service-account JSON,
   `JWT_SECRET` to at least 32 random characters, and `CLIENT_URL` to the exact
   deployed frontend origin (multiple origins may be comma-separated).
4. Set the frontend build variable `VITE_API_URL` to
   `https://<render-service>/api`, then rebuild/redeploy the frontend.
5. Run `npm run migrate` once, then `npm run db:check`. The public
   `/api/health` endpoint performs a live database query and returns HTTP 503
   when the database is unavailable.

## Structure
```
src/
  components/{common,layout,cards,navigation,ui,messages}
  pages/        Login, Signup, Home, Videos, Explore, Notifications,
                 Messages, Profile, EditProfile, Settings, ParentControls,
                 Reports, SafeCenter, About
  context/      AuthContext, ThemeContext, PostsContext, LanguageContext
  hooks/        useScrollDirection, useModeration, useDebouncedValue
  services/     authService (mock), moderationService (Smart Ethical Shield)
  data/         mock posts/videos/articles/notifications
  routes/       ProtectedRoute
  utils/        ageGroup helpers
backend/
  src/{config,models,routes,controllers,middleware,services,utils}
```

## Notes
- Frontend auth is a local-storage mock so the app works fully offline;
  swap `src/services/authService.js` calls for real `fetch()`s to `/backend` when ready.
- Age at signup determines filtering tier (Kids / Teen / Adult) — see `src/utils/ageGroup.js`.
- Bottom navigation auto-hides on scroll-down and reveals on scroll-up.

## Stability & polish pass (latest)
- **Fixed the Explore search freeze**: the infinite-scroll observer could re-fire indefinitely
  whenever a search/category filter shrank the visible grid, appending unbounded content and
  locking up the tab. Search input is now debounced, auto-loading pauses while filtering, and a
  hard page cap prevents runaway loads.
- Fixed a real bug where uploaded avatars (Signup & Edit Profile) were stored as blob object URLs
  in `localStorage` — those break after a page refresh. They're now persisted as base64 data URLs.
- Fixed an object-URL memory leak in the post composer (URLs weren't revoked when media was removed
  or the composer was cancelled).
- Messages threads are now functional — tapping a conversation opens a real (in-memory) chat view
  instead of doing nothing.
- Modals now close on <kbd>Esc</kbd> and lock background scroll while open.
- Softened a couple of user-facing "AI" mentions to "Smart"/"automated" moderation language.
- Added a new **Mindful Break** feature on the Home page: a short guided breathing exercise —
  a wellbeing-first touch you won't find on a typical social feed.
- Backend: added lightweight, dependency-free request validation and rate limiting for auth
  endpoints, graceful duplicate-email handling, basic security headers, a request body size cap,
  and a 404 handler.
