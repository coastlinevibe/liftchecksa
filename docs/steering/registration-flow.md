# LiftCheck Registration & Verification Flow

## Status

This document reflects the official driver signup flow currently implemented in the app.

---

## Official Driver Flow

### 1. Open Driver Signup
- User starts on `/register?type=driver`
- The register page loads the driver form when `type=driver`
- Existing authenticated users are redirected away from `/register`

### 2. Enter Basic Account Details
- First name
- Surname
- Phone number
- Email address
- Password
- Provider plan
  - 3 months
  - 12 months

### 3. Submit Signup
- `signUp(...)` creates the Supabase auth user
- A `profiles` row is created with `role = 'driver'` and `membership_status = 'pending'`
- A `driver_profiles` row is created with `verification_status = 'pending'`
- A `payments` row is created with `status = 'pending'`
- The page shows the payment reference and amount
- The user is auto-signed in and sent to `/dashboard/driver`

### 4. Upload Proof of Payment
- The driver uses the dashboard payment banner
- The payment proof is uploaded on `/payment/upload`
- The proof is stored in the `payment-proofs` bucket
- The dashboard shows `Verification In Progress` while admin reviews the proof

### 5. Payment Approved
- Once admin approves payment, the driver dashboard shows the add-vehicle CTA
- The dashboard no longer shows the payment banner
- The driver can now continue to vehicle registration

### 6. Add Vehicle and ID
- The driver opens `/dashboard/driver/vehicles/add`
- The form collects:
  - Make
  - Model
  - Colour
  - Licence plate
  - Seat capacity
- The driver uploads:
  - ID document
  - Vehicle photo
- The page uploads:
  - ID document to `id-documents`
  - Vehicle photo to `vehicle-photos`
- The page stores `driver_profiles.id_document_url`
- The page creates a vehicle with `verification_status = 'pending'`

### 7. Admin Review
- Admin review screens display the driver ID document and the vehicle image before approval
- Vehicle and ID are reviewed together
- The vehicle application remains pending until approved

### 8. Approved Driver State
- After approval, the driver dashboard shows a verified badge
- The dashboard message changes to approved/active wording
- The driver can browse and search available routes
- Route application pages become available for the approved vehicle

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

## Admin Review Summary

### Driver Payment Review
- Payment proof is checked first
- If approved, the dashboard unlocks vehicle registration

### Driver Vehicle Review
- Admin checks the ID document and vehicle image together
- Vehicle details and plate must match the photo
- Once approved, the driver is marked verified

---

## Status Fields Used

### profiles
- `membership_status`
- `membership_type`
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

## Not Part Of The Official Driver Signup Flow
- Selfie upload during signup
- Driver licence upload during signup
- Proof of address upload
- Licence disc upload

## Note
- The old flow that uploaded ID and selfie during `/register` is no longer the source of truth
- The driver onboarding path is: signup, payment proof, vehicle + ID, admin approval, verified dashboard
