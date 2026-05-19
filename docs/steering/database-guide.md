---
inclusion: auto
---

# LiftCheck S.A Database Guide

## Database Overview

LiftCheck S.A uses **Supabase** (PostgreSQL) as its database with comprehensive Row Level Security (RLS) policies.

**Project Details:**
- Project ID: `bfouoswqvgwentswoorl`
- URL: `https://bfouoswqvgwentswoorl.supabase.co`
- Region: EU West 1

## Working with the Database

### Using Kiro Power (Recommended)

Always use the Supabase Kiro Power for database operations:

```typescript
// 1. Activate the power
kiroPowers.activate("supabase-hosted")

// 2. List tables
kiroPowers.use({
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "list_tables",
  arguments: {
    project_id: "bfouoswqvgwentswoorl",
    schemas: ["public"],
    verbose: true
  }
})

// 3. Apply migrations
kiroPowers.use({
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "apply_migration",
  arguments: {
    project_id: "bfouoswqvgwentswoorl",
    name: "migration_name",
    query: "SQL query here"
  }
})

// 4. Execute SQL (for queries, not DDL)
kiroPowers.use({
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "execute_sql",
  arguments: {
    project_id: "bfouoswqvgwentswoorl",
    query: "SELECT * FROM profiles LIMIT 10"
  }
})
```

### Database Schema

#### Core Tables

**1. profiles** - User profiles (all users)
```sql
- id: UUID (PK)
- user_id: UUID (FK to auth.users) UNIQUE
- role: user_role (member, driver, group_admin, platform_admin)
- first_name: VARCHAR(100)
- surname: VARCHAR(100)  # Full surname for better security
- phone: VARCHAR(20)
- profile_photo_url: TEXT
- membership_type: membership_type (basic, plus, provider_monthly, provider_quarterly, provider_annual, group_admin)
- membership_status: membership_status (pending, active, expired, suspended)
- membership_expires_at: TIMESTAMP
- zii_status: zii_status (inactive, active, expired)
- home_province: VARCHAR(100)
- created_at, updated_at: TIMESTAMP
```

**2. driver_profiles** - Driver-specific data
```sql
- id: UUID (PK)
- user_id: UUID (FK to auth.users) UNIQUE
- verification_status: verification_status
- licence_status: verification_status
- id_status: verification_status
- vehicle_status: verification_status
- provider_plan: VARCHAR(50)
- provider_expires_at: TIMESTAMP
- completed_trips: INTEGER
- rating_average: DECIMAL(3,2)
- rating_count: INTEGER
- cancellation_count: INTEGER
- is_suspended: BOOLEAN
- suspension_reason: TEXT
- id_document_url: TEXT
- licence_document_url: TEXT
- proof_of_address_url: TEXT
- created_at, updated_at: TIMESTAMP
```

**3. vehicles** - Driver vehicles
```sql
- id: UUID (PK)
- driver_id: UUID (FK to driver_profiles.id)  # References driver_profiles.id, NOT profiles.user_id
- make: VARCHAR(100)
- model: VARCHAR(100)
- colour: VARCHAR(50)
- licence_plate: VARCHAR(20)
- year: INTEGER
- licence_disc_url: TEXT
- vehicle_photo_url: TEXT
- verification_status: verification_status
- is_active: BOOLEAN
- created_at, updated_at: TIMESTAMP
```

**IMPORTANT**: The `driver_id` column references `driver_profiles.id`, not `profiles.user_id`. Always fetch the driver profile ID first:

```typescript
// ✅ Correct pattern
const { data: driverProfile } = await supabase
  .from('driver_profiles')
  .select('id')
  .eq('user_id', user.id)
  .single();

const { data: vehicles } = await supabase
  .from('vehicles')
  .select('*')
  .eq('driver_id', driverProfile.id);  // Use driver_profiles.id

// ❌ Wrong pattern
const { data: vehicles } = await supabase
  .from('vehicles')
  .select('*')
  .eq('driver_id', user.id);  // This will fail!
```

**4. trips** - Trip listings
```sql
- id: UUID (PK)
- driver_id: UUID (FK to driver_profiles.id)  # References driver_profiles.id, NOT profiles.user_id
- vehicle_id: UUID (FK to vehicles)
- origin: VARCHAR(200)
- destination: VARCHAR(200)
- route_corridor: VARCHAR(200)
- departure_date: DATE
- departure_time: TIME
- seats_total: INTEGER
- seats_available: INTEGER
- cost_share_amount: DECIMAL(10,2)
- luggage_rules: TEXT
- pickup_points: TEXT[]
- dropoff_points: TEXT[]
- notes: TEXT
- passenger_rules: TEXT
- status: trip_status (draft, published, full, completed, cancelled)
- public_slug: VARCHAR(100) UNIQUE
- created_at, updated_at: TIMESTAMP
```

**IMPORTANT**: The `driver_id` column references `driver_profiles.id`, not `profiles.user_id`. Always fetch the driver profile ID first:

```typescript
// ✅ Correct pattern
const { data: driverProfile } = await supabase
  .from('driver_profiles')
  .select('id')
  .eq('user_id', user.id)
  .single();

const { data: trips } = await supabase
  .from('trips')
  .select('*')
  .eq('driver_id', driverProfile.id);  // Use driver_profiles.id

// ❌ Wrong pattern
const { data: trips } = await supabase
  .from('trips')
  .select('*')
  .eq('driver_id', user.id);  // This will fail!
```

**5. trip_requests** - Passenger booking requests
```sql
- id: UUID (PK)
- trip_id: UUID (FK to trips)
- passenger_id: UUID (FK to profiles)
- status: request_status (pending, accepted, rejected, cancelled)
- message: TEXT
- pickup_point: VARCHAR(200)
- dropoff_point: VARCHAR(200)
- requested_at: TIMESTAMP
- accepted_at: TIMESTAMP
- rejected_at: TIMESTAMP
- cancelled_at: TIMESTAMP
- UNIQUE(trip_id, passenger_id)
```

**6. payments** - Payment records
```sql
- id: UUID (PK)
- user_id: UUID (FK to auth.users)
- plan_type: membership_type
- amount: DECIMAL(10,2)
- payment_reference: VARCHAR(100) UNIQUE
- proof_url: TEXT
- status: payment_status (pending, approved, rejected, expired)
- reviewed_by: UUID (FK to auth.users)
- activated_at: TIMESTAMP
- expires_at: TIMESTAMP
- created_at: TIMESTAMP
```

**7. ratings** - Trip ratings and reviews
```sql
- id: UUID (PK)
- trip_id: UUID (FK to trips)
- reviewer_id: UUID (FK to profiles)
- reviewed_user_id: UUID (FK to profiles)
- rating: INTEGER (1-5)
- feedback: TEXT
- tags: TEXT[]
- created_at: TIMESTAMP
- UNIQUE(trip_id, reviewer_id, reviewed_user_id)
```

**8. reports** - Scammer reports
```sql
- id: UUID (PK)
- reporter_id: UUID (FK to profiles)
- reported_user_id: UUID (FK to profiles)
- trip_id: UUID (FK to trips)
- report_type: VARCHAR(100)
- description: TEXT
- evidence_url: TEXT
- status: report_status
- reviewed_by: UUID (FK to auth.users)
- reviewed_at: TIMESTAMP
- admin_notes: TEXT
- created_at: TIMESTAMP
```

#### Supporting Tables

9. **trip_chats** - In-app messaging
10. **verifications** - Document verification records
11. **bluetooth_tokens** - Offline verification tokens (Bluetooth)
12. **bluetooth_handshakes** - Offline verification records (Bluetooth)
13. **saved_routes** - User saved routes
14. **trusted_drivers** - Passenger trusted driver lists
15. **trip_checkins** - Safety check-ins

### Enums

```sql
user_role: 'member' | 'driver' | 'group_admin' | 'platform_admin'
membership_type: 'basic' | 'plus' | 'provider_monthly' | 'provider_quarterly' | 'provider_annual' | 'group_admin'
membership_status: 'pending' | 'active' | 'expired' | 'suspended'
verification_status: 'pending' | 'approved' | 'rejected' | 'expired'
trip_status: 'draft' | 'published' | 'full' | 'completed' | 'cancelled'
request_status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
payment_status: 'pending' | 'approved' | 'rejected' | 'expired'
bluetooth_status: 'inactive' | 'active' | 'expired'
report_status: 'new' | 'under_review' | 'warning_issued' | 'suspended' | 'banned' | 'cleared' | 'appeal_requested'
```

### Database Functions

**1. update_updated_at_column()**
- Automatically updates `updated_at` timestamp on row updates
- Triggered on: profiles, driver_profiles, vehicles, trips

**2. generate_payment_reference(plan)**
- Generates unique payment references
- Format: LC-M-xxxxx (basic), LC-P-xxxxx (plus), LC-D-xxxxx (provider)

**3. update_driver_rating()**
- Automatically recalculates driver rating average and count
- Triggered after new rating is inserted

### Row Level Security (RLS)

All tables have RLS enabled with comprehensive policies:

**Profiles:**
- Users can view, update, and insert their own profile
- Public cannot view other profiles directly

**Driver Profiles:**
- Users can view, update, and insert their own driver profile
- Public can view driver profiles through trips

**Vehicles:**
- Drivers can manage their own vehicles
- Public can view vehicles through trips

**Trips:**
- Anyone can view published trips
- Drivers can manage their own trips

**Trip Requests:**
- Passengers and drivers can view their own requests
- Passengers can create requests
- Both can update request status

**Payments:**
- Users can view and create their own payments
- Admins can review and approve

### Common Queries

**Get user profile with driver data:**
```sql
SELECT 
  p.*,
  dp.*
FROM profiles p
LEFT JOIN driver_profiles dp ON p.user_id = dp.user_id
WHERE p.user_id = auth.uid();
```

**Get available trips with driver info:**
```sql
SELECT 
  t.*,
  p.first_name,
  p.surname,  -- Full surname, not initial
  dp.rating_average,
  dp.completed_trips,
  v.make,
  v.model,
  v.colour
FROM trips t
JOIN driver_profiles dp ON t.driver_id = dp.id  -- Join on driver_profiles.id
JOIN profiles p ON dp.user_id = p.user_id
JOIN vehicles v ON t.vehicle_id = v.id
WHERE t.status = 'published'
  AND t.seats_available > 0
  AND t.departure_date >= CURRENT_DATE
ORDER BY t.departure_date ASC;
```

**Get trip requests for a driver:**
```sql
SELECT 
  tr.*,
  p.first_name,
  p.surname,  -- Full surname, not initial
  p.phone
FROM trip_requests tr
JOIN profiles p ON tr.passenger_id = p.id
WHERE tr.trip_id IN (
  SELECT id FROM trips 
  WHERE driver_id IN (
    SELECT id FROM driver_profiles WHERE user_id = auth.uid()
  )
)
ORDER BY tr.requested_at DESC;
```

### Migration Workflow

1. **Make schema changes** using Kiro Power `apply_migration`
2. **Check for security issues** using `get_advisors`
3. **Fix any issues** with additional migrations
4. **Generate TypeScript types** using `generate_typescript_types`
5. **Update local types file** at `lib/types/database.types.ts`

### Best Practices

1. **Always use RLS** - Never disable RLS on tables
2. **Use transactions** for multi-table operations
3. **Index foreign keys** - Already done for performance
4. **Use enums** for status fields - Type safety
5. **Validate data** in application layer before database
6. **Use server actions** for all database operations
7. **Never expose database credentials** in client code
8. **Test RLS policies** thoroughly before production
9. **Use prepared statements** to prevent SQL injection
10. **Monitor query performance** with Supabase dashboard

### Critical Pattern: Driver-Related Queries

**ALWAYS follow this pattern when working with `vehicles` or `trips` tables:**

```typescript
// Step 1: Get authenticated user
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return { error: 'Not authenticated' };
}

// Step 2: Get driver profile ID
const { data: driverProfile } = await supabase
  .from('driver_profiles')
  .select('id')
  .eq('user_id', user.id)
  .single();

if (!driverProfile) {
  return { error: 'Driver profile not found' };
}

// Step 3: Use driver_profiles.id for queries
const { data: vehicles } = await supabase
  .from('vehicles')
  .select('*')
  .eq('driver_id', driverProfile.id);  // ✅ Correct

const { data: trips } = await supabase
  .from('trips')
  .select('*')
  .eq('driver_id', driverProfile.id);  // ✅ Correct
```

**Why this matters:**
- `vehicles.driver_id` → `driver_profiles.id` (NOT `profiles.user_id`)
- `trips.driver_id` → `driver_profiles.id` (NOT `profiles.user_id`)
- RLS policies check `driver_profiles.id`, not `user.id`
- Using `user.id` directly will cause RLS policy errors

**Files that implement this correctly:**
- `app/dashboard/driver/page.tsx` - Driver dashboard
- `app/dashboard/driver/vehicles/page.tsx` - Vehicles list
- `app/dashboard/driver/vehicles/add/page.tsx` - Add vehicle
- `lib/trips/actions.ts` - All trip actions

### Troubleshooting

**Issue: RLS policy blocking query**
- Check if user is authenticated: `auth.uid()`
- Verify policy conditions match your query
- Test with `get_advisors` for missing policies

**Issue: Foreign key constraint violation**
- Ensure referenced records exist
- Check cascade delete settings
- Verify user has permission to reference record

**Issue: Unique constraint violation**
- Check for duplicate values
- Verify unique indexes
- Handle conflicts in application logic

**Issue: Type mismatch**
- Regenerate TypeScript types
- Check enum values match database
- Verify column types in schema
