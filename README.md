# LiftCheck - Verified Lift Club Safety Platform

**Check the driver before you pay. Confirm before you ride.**

LiftCheck is a mobile-first PWA (Progressive Web App) for South African lift club users. It adds a safety, verification, booking and trust layer on top of existing Facebook and WhatsApp lift groups.

## Core Features

- ✅ **Driver Verification** - ID and vehicle checks
- ✅ **Driver Identification Cards** - View driver, vehicle and trip details before paying
- ✅ **In-App Chat** - Safe messaging with image sending
- ✅ **Zii Verify** - Offline Bluetooth verification when no data available
- ✅ **Match Check** - Confirm driver, vehicle and plate at pickup
- ✅ **Ratings & Reports** - Build trust and report scammers
- ✅ **Trip Share** - Optional live location sharing (Plus members)
- ✅ **EFT Payment System** - Simple annual membership payments

## Tech Stack

- **Frontend**: Next.js 16 with TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL with RLS)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Icons**: Lucide React

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Create `.env.local` file:

```bash
cp .env.local.example .env.local
```

4. Add your Supabase credentials to `.env.local`

### 3. Run Database Schema

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy the contents of `supabase-schema.sql`
4. Run the SQL script

This will create:
- All database tables with proper relationships
- Row Level Security (RLS) policies
- Indexes for performance
- Helper functions and triggers

### 4. Configure Storage Buckets

In Supabase Dashboard > Storage, create these buckets:

- `profile-photos` (public)
- `vehicle-photos` (public)
- `id-documents` (private, admin only)
- `payment-proofs` (private)
- `chat-images` (private)
- `evidence-uploads` (private)

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Note: on this machine, local Node-based scripts run through `scripts/next-with-local-ca.cjs` so Next.js trusts the exported Avast HTTPS-scanning root certificate. This replaces the insecure `NODE_TLS_REJECT_UNAUTHORIZED=0` workaround.

## Project Structure

```
liftcheck/
├── app/                    # Next.js app router pages
│   ├── page.tsx           # Landing page
│   ├── register/          # Registration flows
│   ├── dashboard/         # User dashboards
│   ├── trips/             # Trip pages
│   └── admin/             # Admin panel
├── lib/
│   ├── supabase/          # Supabase clients
│   └── types/             # TypeScript types
├── components/            # Reusable React components
└── public/                # Static assets
```

## User Roles

### Member / Passenger
- Search and view trips
- Request seats
- Chat with drivers
- View driver ID cards
- Rate and report
- **Basic**: R36/year
- **Plus**: R96/year (includes Trip Share, route alerts)

### Verified Provider / Driver
- Create and manage trips
- Generate shareable trip links
- Accept/reject passenger requests
- Build reputation through ratings
- Register account, complete vehicle setup, and then create trips
- **Cost**: R120/3 months or R300/year

### Group Admin
- Free access
- Access to verified driver lists
- Scam alerts
- Safety post templates

### Platform Admin
- Approve driver verifications
- Review payments
- Manage reports
- Suspend users

## Payment Flow (MVP)

1. User registers and selects plan
2. App generates unique reference (e.g., `LC-M-10482`)
3. User pays via EFT to provided banking details
4. User uploads proof of payment
5. Admin reviews and activates membership
6. Membership active for 365 days

### Driver Onboarding Flow

1. User chooses the driver registration path
2. App creates the driver account and payment reference
3. User is redirected to `/dashboard/driver`
4. Driver uploads payment proof from the dashboard
5. Admin reviews the payment proof
6. Once payment is approved, the add-vehicle CTA appears on the dashboard
7. Driver uploads ID document and vehicle photo on `/dashboard/driver/vehicles/add`
8. Admin reviews the vehicle image and ID document together
9. Driver is unlocked for route applications after approval and sees the verified badge

## Safety Features

### Driver Identification Card
Shows passengers:
- Driver photo and name
- Verified badge
- Vehicle make/model/colour
- Licence plate
- Zii Verify status
- Completed trips
- Rating average
- Route and pickup details

### Match Check
Before getting in, passengers check:
- Driver face matches profile
- Vehicle matches app
- Licence plate matches app
- Zii/PWA verification confirms identity

### Manual Check-ins
- I am waiting
- I have been picked up
- I have arrived
- Something is wrong

### Trip Share (Plus Only)
- Off by default
- User-controlled
- Per-trip activation
- Shared only with selected trusted contact
- Stops automatically after trip

## Zii Integration

Zii provides offline verification via Bluetooth when users don't have data. This is crucial for:
- Rural pickup points
- Petrol stations
- Areas with weak signal
- Users low on airtime

The online + offline trust loop:
1. Passenger views trip online
2. Requests seat in PWA
3. Driver accepts
4. At pickup: verify online (if data) or via Zii Bluetooth (if no data)
5. Confirmation syncs later
6. Both parties rate each other

## Legal Positioning

LiftCheck is positioned as a **private lift club verification platform**, NOT a commercial transport service.

✅ Use this language:
- Verified profile
- Share travel costs
- Check before you pay
- Safety tools
- Private lift club

❌ Avoid this language:
- Earn money driving
- Taxi alternative
- Guaranteed safe
- Transport operator

## Development Roadmap

### MVP (Current)
- [x] Database schema
- [x] Landing page
- [ ] Registration flows
- [ ] Driver verification
- [ ] Trip creation
- [ ] Public trip pages
- [ ] Passenger requests
- [ ] In-app chat
- [ ] Driver/Passenger ID cards
- [ ] Match Check
- [ ] Ratings & reports
- [ ] Admin dashboard
- [ ] Payment proof upload

### Phase 2
- [ ] Zii Bluetooth integration
- [ ] Trip Share (Plus feature)
- [ ] Route alerts
- [ ] Trusted drivers list
- [ ] Family trip link
- [ ] Scam Watch Plus

### Phase 3
- [ ] Pickup point safety ratings
- [ ] Student travel mode
- [ ] Voucher wallet
- [ ] Driver reliability score
- [ ] AI document review assist
- [ ] AI scam pattern detection

## Contributing

This is a private project for South African lift club safety. For questions or contributions, contact the project team.

## License

Proprietary - All rights reserved

---

**LiftCheck** - Verified lift club safety for South Africa
