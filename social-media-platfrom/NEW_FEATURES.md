# New Features: Calling, Groups & Group Chat

## Setup
1. `cd backend && npm install` (adds `socket.io`)
2. `npm install` in the project root (adds `socket.io-client`)
3. Run the new migrations: `cd backend && npm run migrate`
   - `005_groups_calls_presence.sql` — groups, membership, roles, join
     requests, invitations, group chat extensions, educational extras,
     calls, call sessions/participants/logs, user presence.
   - `006_groups_calls_rls.sql` — Supabase RLS policies for the above.
4. Start as usual: `npm run dev` (runs API + Vite together).

No new environment variables are required — Socket.IO reuses `JWT_SECRET`
and `CLIENT_URL` from the existing `.env`.

## What's new

### Voice & video calling
- WebRTC peer-to-peer media, Socket.IO signaling (`backend/src/sockets/callHandlers.js`).
- Call lifecycle: invite → ringing (30s timeout) → accept/decline → active → end,
  all persisted to `calls` / `call_sessions` / `call_participants` / `call_logs`.
- Mute, camera on/off, switch camera (mobile), live duration timer, ICE-restart
  based reconnection handling, busy/offline detection to block simultaneous calls.
- Frontend: `src/context/CallContext.jsx` (state machine + WebRTC),
  `src/components/calls/CallOverlay.jsx` (incoming/outgoing/in-call UI),
  `src/components/calls/CallButtons.jsx` (drop this into any profile/DM header
  to start a call — not yet wired into existing pages to avoid touching
  files outside this feature's scope; add `<CallButtons userId=... userName=... />`
  wherever you want the buttons to appear).

### Groups & group chat
- Full CRUD, public/private privacy, categories, educational flag, avatar/cover,
  join requests, invitations, member roles (owner/admin/member), promote/demote,
  remove member, transfer ownership, leave, search, suggested groups.
- Group chat reuses the existing `conversations`/`messages` tables (one
  conversation per group) so it inherits proven infra — text, images, video,
  documents, replies, timestamps, and read state — while adding pins,
  per-message receipts, and group notifications.
- Realtime via Socket.IO rooms (`group:<id>`): new messages, deletes,
  pin/unpin, and typing indicators.
- Educational groups get an extra "Classroom" tab: announcements and
  assignments (`group_announcements`, `group_assignments`).
- Frontend: `src/pages/Groups.jsx` (discover/search/create),
  `src/pages/GroupDetail.jsx` (chat/members/classroom tabs), reachable from
  the new group icon in the top bar or `/groups`.

### Presence
- `user_presence` table + in-memory socket map track online/offline status
  per user across multiple tabs/devices (`backend/src/services/presenceService.js`).
- `GET /api/presence?userIds=...` for bulk lookups; `presence:update` socket
  event for realtime UI updates.

## Notes on file uploads
Group chat attachments and group avatars/covers currently accept a URL or a
base64 data URL, matching this project's existing pattern for post images
(no object-storage/multer service was wired up previously). If you add
Supabase Storage or S3 later, swap the `fileUrl`/`avatarUrl` fields in
`groupService.js` and `groupMessageController.js` for real upload calls —
the schema already has nullable `media_id` columns ready for that.
