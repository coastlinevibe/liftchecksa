---
inclusion: manual
---

# Registration Implementation TODO

## Database Schema ✅ DONE
- [x] Remove `driver_profiles.licence_document_url`
- [x] Remove `driver_profiles.proof_of_address_url`
- [x] Remove `driver_profiles.licence_status`
- [x] Remove `vehicles.licence_disc_url`
- [x] Drop `verifications` table
- [x] Add `profiles.id_document_url` for all users
- [x] Update TypeScript types

## Registration Page Updates ✅ DONE

### Step 1: Basic Info ✅
- Email, password, first name, surname, phone
- Role selection (member/driver)
- Plan selection (member: basic/plus, driver: 1/3/12 months)

### Step 2: Identity Verification ✅
**For ALL users (members and drivers):**
- [x] Add ID document upload field
  - Accept: image/jpeg, image/png, image/jpg, application/pdf
  - Label: "ID Document (SA ID, Passport, or Driver's Licence)"
  - Required field
  - Shows file name when selected
  
- [x] Add selfie/avatar upload field
  - Accept: image/jpeg, image/png, image/jpg
  - Label: "Selfie (Clear face photo to match ID)"
  - Required field
  - Shows file name when selected
  - Camera capture option (mobile)

### Step 3: Payment Selection ✅
- Plan selection integrated into form
- Payment reference generated on submit
- Success screen shows payment details
- Link to payment upload page

### File Upload Implementation ✅
- [x] Files passed to signUp function
- [x] Upload to Supabase Storage on form submit
- [x] Store URLs in database
- [x] Buckets used:
  - `id-documents` - For ID/Passport/Licence
  - `profile-photos` - For selfies/avatars

## Vehicle Page Updates ✅ DONE

### Add Vehicle Form
- [x] Keep existing fields (make, model, colour, plate)
- [x] Add vehicle photo upload
  - Accept: image/jpeg, image/png, image/jpg
  - Label: "Vehicle Photo (showing licence plate)"
  - Required field
  - Preview uploaded image
  - Camera capture option (mobile)
- [x] Upload to vehicle-photos bucket
- [x] Store URL in vehicles.vehicle_photo_url

## Admin Dashboard Updates ✅ DONE

### Pending Registrations View
- [x] Show user basic info
- [x] Show selfie (view as avatar)
- [x] Show ID document upload status
- [x] Show selfie upload status
- [x] Full document viewer with approve/reject
- [x] Show payment proof (view/download)
- [x] Approve/Reject buttons with actions
- [x] Add notes field for rejection reason
- [x] Verifications listing page created

### Pending Vehicles View
- [x] Show vehicle details
- [x] Show vehicle photo (view)
- [x] Show driver info
- [x] Approve/Reject buttons
- [x] Add notes field for rejection reason

## Auth Actions Updates ✅ DONE

### signUp function
- [x] Accept ID document file
- [x] Accept selfie file
- [x] Upload files to Supabase Storage
- [x] Store URLs in `profiles.id_document_url` and `profiles.profile_photo_url`
- [x] For drivers: Also store in `driver_profiles.id_document_url`

## Supabase Storage Setup ✅ DONE

### Buckets Created
- [x] `id-documents` (private)
- [x] `profile-photos` (public to authenticated)
- [x] `payment-proofs` (private)
- [x] `vehicle-photos` (public to authenticated)

### RLS Policies
- [x] Applied through Supabase Dashboard UI
- [x] Authenticated users can upload/view own files
- [x] Simple policies for MVP

## Testing Checklist 📋

### Registration Flow
- [ ] Member can register with ID + selfie
- [ ] Driver can register with ID + selfie
- [ ] Files upload successfully
- [ ] Files are stored in correct buckets
- [ ] URLs are saved in database
- [ ] User status is 'pending'
- [ ] User cannot login until approved

### Admin Review
- [ ] Admin can see pending registrations
- [ ] Admin can view ID documents
- [ ] Admin can view selfies
- [ ] Admin can view payment proofs
- [ ] Admin can approve registration
- [ ] User receives email notification
- [ ] User can login after approval

### Vehicle Addition
- [ ] Driver can add vehicle after approval
- [ ] Vehicle photo uploads successfully
- [ ] Vehicle status is 'pending'
- [ ] Admin can review vehicle
- [ ] Admin can approve vehicle
- [ ] Driver can create trips after vehicle approved

## Payment Proof Upload Page ✅ DONE

### Features Implemented
- [x] Load pending payment for current user
- [x] Display payment reference and amount
- [x] Display bank details (Tyme Bank)
- [x] Copy payment reference to clipboard
- [x] File upload with preview (image/PDF)
- [x] Upload to payment-proofs bucket
- [x] Store URL in payments.proof_url
- [x] Success screen after upload
- [x] Error handling

1. ✅ **DONE**: Supabase Storage setup (buckets + RLS)
2. ✅ **DONE**: Update registration page with file uploads
3. ✅ **DONE**: Update auth actions to handle file uploads
4. ✅ **DONE**: Update admin dashboard to show documents
5. ✅ **DONE**: Update vehicle page with photo upload
6. ✅ **DONE**: Payment proof upload page
7. 🔄 **NEXT**: Admin payment review page
8. 🔄 **LATER**: Email notifications for approvals

## Notes

- File size limit: 2MB per file
- Supported formats: JPG, PNG, PDF (for ID documents)
- Mobile camera capture for better UX
- Image compression before upload (optional)
- Progress indicators during upload
- Error handling for failed uploads
- Retry mechanism for network issues

