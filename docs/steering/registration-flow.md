# LiftCheck Registration & Verification Flow

## Status

This document reflects the official signup flow currently implemented in the app.

---

## Official Driver Signup Flow

### Step 1: Open Driver Signup
- User starts on `/register?type=driver`
- The register page loads the driver form when `type=driver`
- Existing authenticated users are redirected away from `/register`

### Step 2: Enter Basic Account Details
- First name
- Surname
- Phone number
- Email address
- Password
- Provider plan:
  - 3 months
  - 12 months

### Step 3: Submit Signup
- `signUp(...)` creates the Supabase Auth user
- A `profiles` row is created with:
  - `role = 'driver'`
  - `membership_type`
  - `membership_status = 'pending'`
- A `driver_profiles` row is created with:
  - `verification_status = 'pending'`
  - `provider_plan`
  - `provider_payment_reference`
  - `provider_payment_amount`
  - `provider_payment_status = 'pending'`
- A `payments` row is created with:
  - `plan_type`
  - `amount`
  - `payment_reference`
  - `status = 'pending'`

### Step 4: Success Screen
- The page shows the generated payment reference
- The page shows the selected plan amount
- The user is auto-signed in after a short delay
- Drivers are redirected to `/dashboard/driver/vehicles/add`

### Step 5: Vehicle and ID Setup
- The driver uploads:
  - ID document
  - Vehicle photo
- The driver enters:
  - Make
  - Model
  - Colour
  - Licence plate
  - Seat capacity
- The page uploads:
  - ID document to `id-documents`
  - Vehicle photo to `vehicle-photos`
- The page writes:
  - `driver_profiles.id_document_url`
  - `driver_profiles.id_status = 'pending'`
- The page inserts a new vehicle with:
  - `verification_status = 'pending'`
  - `is_active = true`

### Step 6: Dashboard Review State
- After vehicle submission, the driver is redirected to `/dashboard/driver`
- The dashboard shows payment and verification status
- If payment proof is missing, the payment banner is shown
- If payment proof is pending review, the verification-in-progress banner is shown
- If payment is approved, the dashboard shows the vehicle CTA
- Full route access is available only after:
  - payment approved
  - ID approved
  - vehicle approved
  - at least one active vehicle exists

---

## Member Signup Flow

### Step 1: Open Member Signup
- User starts on `/register?type=member`

### Step 2: Enter Basic Account Details
- First name
- Surname
- Phone number
- Email address
- Password
- Home province
- Membership plan:
  - Basic
  - Plus

### Step 3: Submit Signup
- `signUp(...)` creates the auth user
- A `profiles` row is created with:
  - `role = 'member'`
  - `membership_type`
  - `membership_status = 'pending'`
  - `home_province`
- A `payments` row is created with:
  - `plan_type`
  - `amount`
  - `payment_reference`
  - `status = 'pending'`

### Step 4: Success Screen
- The page shows the generated payment reference
- The user is auto-signed in after a short delay
- Members are redirected to `/dashboard/member`

---

## Payment Model

### Driver Plan Types
- `provider_monthly`
- `provider_quarterly`
- `provider_annual`

### Payment References
- Member Basic: `LC-M-xxxxx`
- Member Plus: `LC-P-xxxxx`
- Driver Monthly: `LC-D1-xxxxx`
- Driver Quarterly: `LC-D3-xxxxx`
- Driver Annual: `LC-D12-xxxxx`

### Payment Proof Upload
- Payment proof is uploaded on `/payment/upload`
- Proof goes into the `payment-proofs` bucket
- URL is stored in `payments.proof_url`
- Dashboard shows the review banner until admin approval

---

## Admin Review Process

### What Admin Reviews
- Basic profile info
- ID document
- Payment proof
- Vehicle photo and vehicle details for drivers

### Admin Actions
- Approve payment
- Approve or reject driver ID verification
- Approve or reject vehicle verification
- Approve or reject renewal payments

---

## Verification Status Summary

### Members
- `profiles.membership_status`: `pending` -> `active`
- `payments.status`: `pending` -> `approved`

### Drivers
- `profiles.membership_status`: `pending` -> `active`
- `payments.status`: `pending` -> `approved`
- `driver_profiles.id_status`: `pending` -> `approved`
- `vehicles.verification_status`: `pending` -> `approved`
- `driver_profiles.vehicle_status`: `pending` -> `approved`
- `driver_profiles.verification_status`: `pending` -> `approved`

### Driver Unlock Condition
- Payment approved
- ID approved
- At least 1 active vehicle
- Vehicle approved

---

## Database Fields Used

### profiles
- `first_name`
- `surname`
- `phone`
- `email`
- `role`
- `membership_type`
- `membership_status`
- `home_province`
- `profile_photo_url`
- `id_document_url`

### driver_profiles
- `id_document_url`
- `id_status`
- `vehicle_status`
- `verification_status`
- `provider_plan`
- `provider_payment_reference`
- `provider_payment_amount`
- `provider_payment_status`
- `provider_payment_proof_url`

### vehicles
- `make`
- `model`
- `colour`
- `licence_plate`
- `seat_capacity`
- `vehicle_photo_url`
- `verification_status`
- `is_active`

### payments
- `plan_type`
- `amount`
- `payment_reference`
- `status`
- `proof_url`
- `activated_at`
- `expires_at`

---

## Removed Or Not Used

### Not Part Of The Official Signup Flow
- Selfie upload during signup
- Driver licence upload during signup
- Proof of address upload
- Licence disc upload

### Note
- The current code uploads the driver's ID document and vehicle photo on `/dashboard/driver/vehicles/add`
- The old "upload ID and selfie during signup" flow is no longer the source of truth

---

## Driver Route Application Flow

### When It Happens
- After the driver has a vehicle and is active enough to browse routes

### Step
- Open a route
- Select a registered vehicle
- Submit the route application for admin review

### Guardrails
- Driver must have a registered vehicle
- Vehicle must belong to the driver
- Vehicle must be active and approved
- Driver must have an approved subscription payment

---

## Storage Buckets Used

- `id-documents` - private bucket for ID documents
- `profile-photos` - selfies or profile photos where used
- `payment-proofs` - private bucket for payment screenshots
- `vehicle-photos` - vehicle images

---

## Why This Flow Exists

- Keeps signup quick
- Moves heavier verification into the dashboard step
- Makes the driver onboarding path explicit
- Avoids the older ambiguous "upload everything during registration" flow
