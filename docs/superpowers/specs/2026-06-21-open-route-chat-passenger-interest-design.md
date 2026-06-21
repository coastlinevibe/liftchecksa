# Open Route Chat + Passenger Interest Design

**Goal:** Add a route-wide open chat for official routes, gated by membership, so active members can join the route conversation and drivers/admins can moderate it without introducing private chat, seat assignment, offers, or ratings.

**Architecture:** Keep the existing route detail pages as the entry points, but split the data model into a public route thread plus participant/interest records and moderation reports. The route page remains the member-facing entry point, the driver route page remains the driver-facing view, and the admin route page becomes the moderation surface. All visibility rules stay server-side through Supabase RLS; the UI only reflects what the database allows.

**Tech Stack:** Next.js App Router, React Server Components, client-side Supabase realtime subscription, Supabase Postgres, Supabase RLS, existing route detail actions/components.

---

### Scope

This PR covers only:

1. one open route chat thread per official route
2. membership gating for chat participation
3. route chat reports for driver-to-admin escalation
4. admin visibility into route chats and reports
5. UI updates on route detail, driver route detail, and admin route detail pages

This PR does not cover:

- seat assignment
- private driver/passenger chat
- route offers
- ratings
- passenger removal from open chat
- phone number exposure inside chat
- negotiated amount sharing

### Functional Rules

- Public/unregistered users can view route schedule and route details only.
- Suspended or expired users cannot join route chat or post chat messages.
- An active member can tap `Join chat` on a route page to join that route's open thread.
- Joining chat is the only passenger interest signal for this PR.
- The assigned driver can read and write in the route thread for their assigned route.
- Platform admin can read all route chats and all route chat reports.
- Only plain text messages are allowed.
- Drivers cannot remove users from open chat.
- Drivers can report a passenger with a reason.

### Data Model

Add the following tables only if the existing `route_chats` model cannot safely support the open-thread design:

- `route_chat_threads`
- `route_chat_messages`
- `route_chat_participants`
- `route_chat_reports`

Preferred shape:

- `route_chat_threads` stores one row per official route thread and links to `official_routes`.
- `route_chat_participants` stores active joins and membership state for the route thread.
- `route_chat_messages` stores text messages only, with sender reference and thread reference.
- `route_chat_reports` stores driver reports against a participant with a reason and moderation status.

If the current `route_chats` table is reused, it must be refactored so it no longer behaves like a direct peer-to-peer chat table. The open route thread must be represented explicitly, not inferred from a driver/passenger pair.

### Security Model

All authorization stays in RLS and server-side checks.

- Active members can read and write only in route chats they have joined.
- Active members can join only when their profile or latest payment is active.
- Assigned drivers can access only route chats for routes assigned to them.
- Platform admin can access all route chats and reports.
- Insert policies must force `sender_id = auth.uid()` through the current profile mapping.
- Users cannot write messages on behalf of another user.
- Users cannot access chat if their membership is inactive, suspended, or expired.
- Public access is route-detail only; no chat rows or participant rows are exposed to anon users.

### UI Changes

#### Route detail page

- show a `Join chat` action for logged-in active members
- hide chat input until the user has joined
- show the route-wide thread once joined
- keep schedule and route information visible to everyone
- do not show phone numbers, private amounts, or ID/payment artifacts in the chat area

#### Driver route detail page

- show the route-wide thread for the assigned driver
- show joined members or interested participants for that route
- allow text replies only
- add a report action for participants
- do not add user-removal controls

#### Admin route detail page

- show the route-wide thread for moderation
- show route chat reports
- keep moderation controls server-side
- do not surface extra private fields in the thread payload

### Data Flow

1. A visitor opens a public route page and sees route details only.
2. An active member taps `Join chat`.
3. The server creates or links the route-thread participation row and returns the route thread.
4. Messages stream through Supabase realtime for the joined thread.
5. The assigned driver sees the same thread for the assigned route and can reply.
6. A driver can file a report against a participant with a reason.
7. Admin sees the chat thread and reports from the route detail admin view.

### API and Server Actions

Reuse existing server-action patterns where possible.

- add a server action for joining the route chat
- add a server action for sending route chat messages
- add a server action for reporting a route participant
- add route-detail fetch helpers that return only safe chat payloads for each audience

The server action that sends chat messages must validate:

- current user is active
- current user is allowed on the route thread
- sender matches the authenticated profile
- message body is plain text

### Payload Privacy

Route chat payloads must not include:

- phone numbers
- private negotiated amounts
- ID documents
- payment proof URLs
- hidden verification metadata

Only the minimum fields required for thread rendering, membership state, and moderation should be returned.

### Testing Strategy

- verify public route pages render schedule-only data for logged-out users
- verify inactive members cannot join or send chat messages
- verify active members can join and post plain text
- verify assigned drivers can read and reply on their assigned route thread
- verify admin can read all route chats and reports
- verify RLS blocks spoofed sender IDs and cross-route writes
- run lint, TypeScript, and production build after implementation

### Implementation Boundary

Keep the first version small:

- one route thread per official route
- one join action
- one plain-text message stream
- one report action
- one admin moderation surface

Do not introduce private 1:1 chat, seat assignment, offers, or ratings in this PR.

