# LiftCheck Routes-Only Rebuild

## Source Of Truth

- The product is route-based.
- `official_routes` is the top-level journey object.
- `driver_route_assignments` connects a driver and vehicle to a route.
- `route_seat_requests` is the passenger booking/request object.
- `route_chats` is the direct passenger-driver conversation object.
- `ride_payment_ledger` is the route payment record.
- `contact_unlocks` is the post-acceptance contact exchange record.

## Core Roles

- `member`
- `driver`
- `group_admin`
- `platform_admin`

## Core Flow

1. User registers.
2. User completes payment and verification.
3. Driver completes vehicle approval.
4. Admin creates an official route.
5. Admin assigns a verified driver and vehicle to that route.
6. Member browses active routes.
7. Member saves routes and gets alerts.
8. Member requests a seat on a route.
9. Member and driver chat directly inside the route thread.
10. Admins review payments, reports, verifications, and assignments.

## What Must Stay Out

- Ad hoc trip publishing
- Public trip links
- Trip-centric booking language
- Mixed trip and route chat models
- Old trip-only dashboards and copy

## Build Rule

- If a screen, helper, policy, or type cannot be explained using routes, assignments, requests, chat, payments, verification, or admin review, it does not belong in the rebuilt app.
