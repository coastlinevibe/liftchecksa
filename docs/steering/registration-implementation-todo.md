# Registration Implementation TODO

## Status

Historical implementation log only. The official flow is documented in `registration-flow.md`.

## Current Truth

### Driver Signup
- Basic account details only on `/register?type=driver`
- Payment reference generated at signup
- Auto-login after signup
- Redirect to `/dashboard/driver`
- Payment proof is uploaded from the dashboard

### Driver Vehicle Setup
- Add vehicle only after payment is approved
- Upload ID document and vehicle photo on `/dashboard/driver/vehicles/add`
- Save `driver_profiles.id_document_url`
- Save `vehicles.vehicle_photo_url`
- Create vehicle with `verification_status = 'pending'`

### Driver Dashboard
- Show payment proof banner until proof is uploaded
- Show verification-in-progress banner after proof upload
- Show vehicle CTA after payment is approved
- Show verified badge and browse routes when payment, ID, and vehicle are approved

### Admin Review
- Driver payment proof is reviewed first
- Vehicle review shows the vehicle image and the driver ID document together
- Vehicle approval unlocks the verified driver state

## Files That Match The Current Flow
- `app/register/RegisterClient.tsx`
- `app/dashboard/driver/page.tsx`
- `app/dashboard/driver/vehicles/add/page.tsx`
- `app/payment/upload/page.tsx`
- `lib/auth/actions.ts`
- `app/admin/verifications/page.tsx`
- `app/admin/verifications/[id]/page.tsx`

## Files That Previously Caused Confusion
- `docs/steering/registration-flow.md`
- `docs/steering/registration-page-updates-needed.md`
- `README.md`

## Notes
- The old "ID + selfie during signup" approach is not current
- The driver onboarding order is signup -> payment proof -> vehicle + ID -> admin approval -> verified dashboard
