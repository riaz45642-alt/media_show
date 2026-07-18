# SafeZone

A calm, ad-free, safety-first social platform for kids & teenagers.

## Stack
- React (Vite) + Tailwind CSS — frontend (`/src`)
- Node.js/Express + PostgreSQL-ready — backend (`/backend`)
- Smart Ethical Shield — placeholder AI moderation architecture (`services/moderationService.js` on both ends)

## Run the frontend
```bash
npm install
npm run dev
```
Visit http://localhost:5173 — sign up (any email/password + age) to enter the app.

## Run the backend (optional, API scaffold only)
```bash
cd backend
npm install
cp .env.example .env   # set DATABASE_URL, JWT_SECRET
npm run dev
```

## Structure
```
src/
  components/{common,layout,cards,navigation,ui}
  pages/        Login, Signup, Home, Videos, Explore, Notifications,
                 Messages, Profile, EditProfile, Settings, ParentControls,
                 Reports, SafeCenter, About
  context/      AuthContext, ThemeContext
  hooks/        useScrollDirection, useModeration
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
