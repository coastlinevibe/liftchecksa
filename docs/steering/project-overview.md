---
inclusion: auto
---

# LiftCheck S.A Project Overview

## Project Description

LiftCheck S.A is a premium mobile-first PWA (Progressive Web App) for South African lift club safety. It serves as a **verification and safety layer** for existing Facebook and WhatsApp lift groups, NOT a full transport marketplace.

## Core Concept

**"Check the driver before you pay. Confirm before you ride."**

LiftCheck helps passengers verify drivers before committing to lifts shared in Facebook/WhatsApp groups. Drivers share verified trip links to their groups, and passengers can view driver ID cards, vehicle details, and ratings before booking.

## Key Features

### For Passengers (Members)
- View verified driver profiles before booking
- See driver ID cards with verification badges
- Check vehicle details and photos
- Read ratings and reviews
- Bluetooth Verification for offline identity verification (no data needed)
- Trip history and saved routes
- In-app messaging with drivers
- Report scammers

### For Drivers (Providers)
- Get verified with ID, licence, and vehicle checks
- Create and share trip links to Facebook/WhatsApp groups
- Manage trip requests
- Build reputation with ratings
- Vehicle management
- Trip Share feature (Plus members) for easy sharing

### For Group Admins
- Free access to help keep their Facebook groups safe
- View verification status of drivers in their groups
- Access to safety reports

## Pricing Model

### Member Plans
- **Basic Member**: R36/year - Essential features
- **Plus Member**: R96/year - Trip Share + advanced features

### Driver Plans (Provider)
- **1 Month**: R45 - Perfect for casual/one-time drivers
- **3 Months**: R120 - Seasonal drivers (Save R15)
- **12 Months**: R300 - Regular drivers (Save R240)

## Payment System

- **EFT-based payment system** (No credit card needed)
- **Bank**: Tyme Bank
- **Account Name**: LiftCheck Safety
- **Account Number**: 51129386380
- Users upload proof of payment
- Admin reviews and activates accounts within 24 hours
- Unique payment references (LC-M-xxxxx, LC-P-xxxxx, LC-D-xxxxx)

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Hosting**: Vercel (recommended)
- **Icons**: Lucide React

## Design Philosophy

### Mobile-First Ultra-Compact Design
- Maximum width: `max-w-md` (448px)
- Minimal padding: `p-2.5`, `p-3`, `p-4` max
- Small text: `text-xs`, `text-sm`, `text-[10px]`
- Tight spacing: `gap-2`, `gap-3`, `mb-2`, `mb-3`
- NO wasted space - every pixel counts

### Color Scheme
- **Primary**: Emerald green (#10b981) - Trust and safety
- **Secondary**: Slate/Navy - Professional and clean
- **Backgrounds**: White for app pages, dark (slate-900) for landing
- **Accents**: Blue for info, red for warnings, yellow for alerts

### Typography
- **Headings**: Bold, concise
- **Body**: Small but readable (text-xs, text-sm)
- **Labels**: Extra small (text-[10px]) for compact forms

## Project Structure

```
liftcheck/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Landing page
│   ├── login/                    # Login page
│   ├── register/                 # Registration flow
│   ├── dashboard/
│   │   ├── member/              # Member dashboard
│   │   └── driver/              # Driver dashboard
│   ├── trips/                   # Trip listing and details
│   ├── messages/                # In-app messaging
│   ├── notifications/           # Notifications
│   ├── settings/                # User settings
│   ├── payment/                 # Payment upload
│   ├── admin/                   # Admin panel
│   └── ...                      # Other pages
├── lib/
│   ├── auth/                    # Authentication actions
│   ├── trips/                   # Trip management actions
│   ├── supabase/                # Supabase clients
│   └── types/                   # TypeScript types
├── public/                      # Static assets
├── .env.local                   # Environment variables
└── middleware.ts                # Route protection

```

## Database Schema

### Core Tables
1. **profiles** - User profiles (all users)
2. **driver_profiles** - Driver-specific data
3. **vehicles** - Driver vehicles
4. **trips** - Trip listings
5. **trip_requests** - Passenger booking requests
6. **trip_chats** - In-app messaging
7. **verifications** - Document verification records
8. **ratings** - Trip ratings and reviews
9. **reports** - Scammer reports
10. **payments** - Payment records
11. **saved_routes** - User saved routes
12. **trusted_drivers** - Passenger trusted driver lists
13. **zii_tokens** - Offline verification tokens
14. **zii_handshakes** - Offline verification records
15. **trip_checkins** - Safety check-ins

### Security
- Row Level Security (RLS) enabled on all tables
- Comprehensive RLS policies for data access control
- Secure functions with proper search_path settings

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://bfouoswqvgwentswoorl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NODE_TLS_REJECT_UNAUTHORIZED=0  # Development only - SSL certificate workaround
```

**Important**: The `NODE_TLS_REJECT_UNAUTHORIZED=0` setting is for development only to bypass SSL certificate issues. Remove this in production!

## Development Workflow

1. **Local Development**: `npm run dev` (runs on localhost:3000)
2. **Database Changes**: Use Supabase MCP tools via Kiro Power
3. **Type Generation**: Auto-generated from Supabase schema
4. **Testing**: Manual testing in browser (no automated tests yet)
5. **Deployment**: Push to GitHub → Auto-deploy to Vercel

## Important Notes

- This is a **PWA**, not a native mobile app
- Focus on **mobile-first** design (desktop is secondary)
- **Verification is key** - all drivers must be verified before they can create trips
- **Safety first** - multiple verification layers (ID, licence, vehicle, ratings, reports)
- **Offline capability** - Zii Verify works without internet via Bluetooth
- **Not a marketplace** - We don't handle payments between drivers and passengers
- **Cost-sharing only** - Drivers share fuel costs, not profit-making

## Target Market

- **Primary**: South African lift club members (Facebook/WhatsApp groups)
- **Secondary**: University students, commuters, long-distance travelers
- **Geographic**: South Africa (all 9 provinces)
- **Age**: 18-65 years
- **Tech-savvy**: Comfortable with smartphones and social media

## Competitive Advantages

1. **Verification Layer** - Not a marketplace, just safety verification
2. **Offline Capability** - Bluetooth Verification works without data
3. **Affordable** - R36-R300/year vs monthly subscriptions
4. **Facebook/WhatsApp Integration** - Works with existing groups
5. **South African Focus** - Built for SA lift clubs specifically
6. **EFT Payments** - No credit card needed

## Future Enhancements

- Real-time GPS tracking during trips
- Emergency SOS button
- Group admin dashboard improvements
- Automated payment verification
- Mobile app (React Native)
- Integration with more social platforms
- AI-powered scammer detection

---

## Recent Updates & Changes

### Database Schema Updates (Latest)

**1. Full Surnames**
- Use `profiles.surname` throughout the app and docs
- Reason: Better security and accountability
- Impact: Registration form now collects full surnames

**2. Driver Payment Plans**
- Added three membership types for drivers:
  - `provider_monthly` - R45/month (casual drivers)
  - `provider_quarterly` - R120/3 months (seasonal drivers, save R15)
  - `provider_annual` - R300/year (regular drivers, save R240)
- Updated `membership_type` enum to include new types
- Registration page updated with plan selection

**3. Banking Details**
- Bank: Tyme Bank
- Account Name: LiftCheck Safety
- Account Number: 51129386380

### Critical Database Pattern Fix

**Foreign Key Relationships:**
- `vehicles.driver_id` → `driver_profiles.id` (NOT `profiles.user_id`)
- `trips.driver_id` → `driver_profiles.id` (NOT `profiles.user_id`)

**All driver-related queries now follow this pattern:**
```typescript
// 1. Get authenticated user
const { data: { user } } = await supabase.auth.getUser();

// 2. Get driver profile ID
const { data: driverProfile } = await supabase
  .from('driver_profiles')
  .select('id')
  .eq('user_id', user.id)
  .single();

// 3. Use driver_profiles.id for queries
const { data } = await supabase
  .from('vehicles')  // or 'trips'
  .select('*')
  .eq('driver_id', driverProfile.id);  // ✅ Correct
```

**Files Updated:**
- `app/dashboard/driver/page.tsx` - Fixed trips queries
- `app/dashboard/driver/vehicles/page.tsx` - Fixed vehicles query
- `app/dashboard/driver/vehicles/add/page.tsx` - Already correct
- `lib/trips/actions.ts` - Already correct

### Authentication & Security

**SSL Certificate Workaround (Development Only):**
- Added `NODE_TLS_REJECT_UNAUTHORIZED=0` to `.env.local`
- Required for local development with Supabase
- **Must be removed in production**

**Password Visibility Toggle:**
- All password fields now have show/hide toggle
- Improves user experience during registration/login

**Logout Buttons:**
- Added to all dashboards (member, driver, admin)
- Shows "Log out" text + icon for accessibility
- Consistent placement across all pages

### UI/UX Improvements

**Navigation:**
- Desktop: Centered tabs in header
- Mobile: Bottom navigation bar with animated indicator
- Consistent back buttons on all pages

**Landing Page:**
- Animated GPS hero background
- FAQ section added
- Pricing clearly displayed with savings highlighted

**Admin Dashboard:**
- Connected to real Supabase data
- Shows pending verifications, payments, reports
- Time ago helper function for timestamps

**Driver Dashboard:**
- Connected to real Supabase data
- Shows active trips, completed trips, earnings
- Stats cards with trip count, rating, earnings

**Vehicles Management:**
- List page shows all driver vehicles
- Add vehicle form with validation
- Status badges (pending, approved, rejected)
- Verification workflow integrated

### Development Environment

**Environment Variables:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://bfouoswqvgwentswoorl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NODE_TLS_REJECT_UNAUTHORIZED=0  # Development only
```

**Super Admin Account:**
- Email: `admin@out.com`
- Password: `123456`
- Role: `platform_admin`

### Known Issues & Solutions

**Issue: RLS Policy Errors**
- Solution: Always use `driver_profiles.id` for driver-related queries
- See "Critical Database Pattern Fix" above

**Issue: SSL Certificate Error**
- Solution: Add `NODE_TLS_REJECT_UNAUTHORIZED=0` to `.env.local`
- Only for development, remove in production

**Issue: Hydration Warning**
- Solution: Added `suppressHydrationWarning` to body tag in layout
- Caused by server/client time mismatch

### Testing Checklist

- [x] Registration works (member & driver)
- [x] Login works with role-based redirects
- [x] Logout works on all dashboards
- [x] Admin dashboard shows real data
- [x] Driver dashboard shows real data
- [x] Vehicles list shows real data
- [x] Add vehicle form works
- [x] Password visibility toggle works
- [x] Mobile navigation works
- [x] Desktop navigation works
- [ ] Trip creation (needs testing)
- [ ] Trip requests (needs implementation)
- [ ] Messaging (needs implementation)
- [ ] Payment upload (needs testing)
- [ ] File uploads (needs implementation)
