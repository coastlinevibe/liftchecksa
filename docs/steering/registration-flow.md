---
inclusion: auto
---

# LiftCheck S.A Registration & Verification Flow

## Overview

Simple, secure registration with ID verification for all users. Admin approves after payment verification.

---

## Registration Flow (All Users)

### Step 1: Basic Information
- Email address
- Password
- First name
- Full surname (not initials)
- Phone number
- Role selection: Member or Driver

### Step 2: Identity Verification (All Users)
- **ID Document Upload**: South African ID, Driver's Licence, or Passport
- **Selfie/Avatar Upload**: Clear face photo to match ID document
- Stored in: 
  - `profiles.profile_photo_url` (selfie for all users)
  - `profiles.id_document_url` (ID document for all users)
  - `driver_profiles.id_document_url` (copy for drivers)

### Step 3: Payment Selection & Proof
**Members:**
- Basic: R36/year
- Plus: R96/year

**Drivers:**
- 1 Month: R45
- 3 Months: R120 (save R15)
- 12 Months: R300 (save R240)

**Payment Details:**
- Bank: Tyme Bank
- Account: LiftCheck Safety
- Account Number: 51129386380
- Reference: Auto-generated (LC-M-xxxxx for Basic, LC-P-xxxxx for Plus, LC-D1-xxxxx, LC-D3-xxxxx, LC-D12-xxxxx for Drivers)

**Payment Proof Upload:**
- Done on `/payment/upload` page after registration
- Screenshot or photo of EFT confirmation
- Must show: amount, reference, date
- Uploaded to `payment-proofs` bucket
- URL stored in `payments.proof_url`

### Step 4: Submit & Auto-Login
- User status: `pending`
- Payment status: `pending`
- Files uploaded to Supabase Storage:
  - ID document → `id-documents` bucket
  - Selfie → `profile-photos` bucket
- URLs stored in database
- **Success screen shows payment reference for 3 seconds**
- **System automatically logs in the user**
- **Redirects to dashboard:**
  - Members → `/dashboard/member`
  - Drivers → `/dashboard/driver`

### Step 5: Dashboard Payment Banner
**User sees prominent banner:**
- ⚠️ "Payment Proof Required" (if not uploaded)
- Payment reference displayed prominently
- Banking details (Tyme Bank, Account: 51129386380)
- "Upload Payment Proof" button → `/payment/upload`

**After uploading payment proof:**
- 🕐 "Verification In Progress" banner
- "Your payment proof has been submitted and is being reviewed"
- "Usually takes 24-48 hours"
- Dashboard features remain disabled

---

## Admin Review Process

### What Admin Checks:
1. **Basic Info**: Name, email, phone look legitimate
2. **ID Document**: 
   - Clear and readable
   - Not expired
   - Valid SA ID/Passport/Licence
3. **Selfie Matches ID**: Face in selfie matches ID photo
4. **Payment Proof**:
   - Correct amount
   - Correct reference number
   - Correct bank account
   - Recent date

### Admin Actions:
- **Approve**: 
  - Set `profiles.membership_status = 'active'`
  - Set `payments.status = 'approved'`
  - Set `payments.activated_at = now()`
  - Set `payments.expires_at = now() + duration`
  - For drivers: Set `driver_profiles.id_status = 'approved'`
  - User can now login
  
- **Reject**:
  - Set `payments.status = 'rejected'`
  - Add notes explaining why
  - User receives email to resubmit

---

## Post-Registration: Driver Vehicle Setup

### When: After driver account is approved and active

### Step 1: Add Vehicle (Driver Dashboard → Vehicles → Add)
- Make (e.g., Toyota)
- Model (e.g., Corolla)
- Colour (e.g., White)
- Licence Plate (e.g., CA 123-456)
- **Vehicle Photo**: Clear photo showing licence plate (REQUIRED)
- Uploaded to `vehicle-photos` bucket
- Stored in: `vehicles.vehicle_photo_url`

**Note**: No licence disc upload required - we're a safety service, not traffic police

### Step 2: Submit Vehicle
- Vehicle status: `pending`
- Driver **cannot create trips** until vehicle approved

---

## Admin Vehicle Verification

### What Admin Checks:
1. **Vehicle Photo**: 
   - Clear and readable
   - Licence plate visible
   - Matches entered plate number
2. **Vehicle Details**: Make, model, colour match photo

### Admin Actions:
- **Approve**:
  - Set `vehicles.verification_status = 'approved'`
  - Set `driver_profiles.vehicle_status = 'approved'`
  - Set `driver_profiles.verification_status = 'approved'`
  - Driver can now create trips
  
- **Reject**:
  - Set `vehicles.verification_status = 'rejected'`
  - Add notes explaining why
  - Driver must resubmit

---

## Verification Status Summary

### Members
- `profiles.membership_status`: pending → active
- `payments.status`: pending → approved
- Can use platform immediately after approval

### Drivers
**Registration Phase:**
- `profiles.membership_status`: pending → active
- `payments.status`: pending → approved
- `driver_profiles.id_status`: pending → approved

**Vehicle Phase:**
- `vehicles.verification_status`: pending → approved
- `driver_profiles.vehicle_status`: pending → approved
- `driver_profiles.verification_status`: pending → approved

**Can Create Trips When:**
- ✅ Payment approved
- ✅ ID approved
- ✅ At least 1 vehicle approved
- ✅ Overall verification_status = 'approved'

---

## Database Fields Used

### profiles
- `profile_photo_url` - Selfie/avatar (all users)
- `id_document_url` - ID/Passport/Licence (all users)
- `membership_status` - pending/active/expired/suspended
- `membership_type` - basic/plus/provider_monthly/provider_quarterly/provider_annual
- `membership_expires_at` - Expiry date
- `home_province` - For members only

### driver_profiles
- `id_document_url` - ID/Passport/Licence document
- `id_status` - pending/approved/rejected
- `vehicle_status` - pending/approved/rejected
- `verification_status` - pending/approved/rejected (overall)

### vehicles
- `vehicle_photo_url` - Vehicle photo showing plate
- `verification_status` - pending/approved/rejected
- `licence_plate` - Entered by driver
- `make`, `model`, `colour` - Vehicle details

### payments
- `proof_url` - Payment proof screenshot
- `status` - pending/approved/rejected
- `payment_reference` - LC-M-xxxxx, LC-P-xxxxx, LC-D-xxxxx
- `amount` - Payment amount
- `activated_at` - When approved
- `expires_at` - When membership expires

---

## Removed/Not Used

### ❌ Not Required:
- Driver's licence document upload (too personal)
- Proof of address (unnecessary)
- Licence disc upload (not traffic police)

### ❌ Removed Fields:
- `driver_profiles.licence_document_url` - Not needed
- `driver_profiles.proof_of_address_url` - Not needed
- `driver_profiles.licence_status` - Not needed
- `vehicles.licence_disc_url` - Not needed

---

## Vehicle Limit

**One vehicle per driver** - Keeps it simple and focused on safety verification, not fleet management.

If driver needs to change vehicle:
- Mark old vehicle as `is_active = false`
- Add new vehicle
- New vehicle goes through verification

---

## User Experience Flow

### Member Journey:
1. Choose "I Need Lifts" → Select plan (Basic/Plus)
2. Fill form: Name, phone, email, password, province
3. Upload ID document + selfie
4. Submit → See payment reference (3 seconds) → **Auto-login** → Redirect to dashboard
5. Dashboard shows payment banner with reference and banking details
6. Make EFT payment with reference
7. Upload payment proof via dashboard button
8. Dashboard shows "Verification In Progress" banner
9. Wait for admin approval (24-48 hours)
10. Dashboard becomes fully active
11. Find trips → Book → Travel safely

### Driver Journey:
1. Choose "I Offer Lifts" → Select plan (1/3/12 months)
2. Fill form: Name, phone, email, password
3. Upload ID document + selfie
4. Submit → See payment reference (3 seconds) → **Auto-login** → Redirect to dashboard
5. Dashboard shows payment banner with reference and banking details
6. Make EFT payment with reference
7. Upload payment proof via dashboard button
8. Dashboard shows "Verification In Progress" banner
9. Wait for admin approval (24-48 hours)
10. Dashboard shows "Add Vehicle" prompt
11. Add vehicle: Make, model, colour, plate, photo
12. Wait for vehicle approval (24-48 hours)
13. Dashboard becomes fully active with "Create New Trip" button
14. Create trips → Share to Facebook/WhatsApp groups → Earn

---

## Admin Dashboard Priorities

### Pending Items to Review:
1. **Pending Registrations** (highest priority)
   - New users waiting for approval
   - Check ID + selfie + payment
   
2. **Pending Vehicles** (after registration approved)
   - Drivers waiting to create trips
   - Check vehicle photo + details

3. **Pending Payments** (renewals)
   - Existing users renewing membership
   - Check payment proof

---

## Security & Safety

### Storage Buckets Used:
- `id-documents` - Private bucket for ID/Passport/Licence documents
- `profile-photos` - Public (authenticated) bucket for selfies/avatars
- `payment-proofs` - Private bucket for payment screenshots
- `vehicle-photos` - Public (authenticated) bucket for vehicle images

### Why ID + Selfie:
- Verify real person, not fake account
- Match face to ID document
- Accountability for drivers and passengers
- Scammer deterrent

### Why Vehicle Photo:
- Verify licence plate matches
- Passengers can identify correct vehicle
- Visual confirmation before getting in
- Safety feature, not policing

### Why Payment Verification:
- Prevent spam/fake accounts
- Ensure serious users only
- Revenue for platform sustainability
- Admin can verify legitimacy

---

## Future Enhancements

- Automated ID verification (OCR + face matching)
- Automated payment verification (bank API)
- Expiry reminders (30 days before)
- Renewal process (simplified)
- Multiple vehicles per driver (if needed)
- Document expiry tracking (optional)

