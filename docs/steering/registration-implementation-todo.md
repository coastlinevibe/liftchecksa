# Registration Implementation TODO

## Status

This file is a historical implementation log. The official flow is documented in `registration-flow.md`.

## Current Official Flow

### Driver Signup
- Basic account details only on `/register?type=driver`
- Payment reference generated at signup
- Auto-login after signup
- Redirect to `/dashboard/driver/vehicles/add`

### Driver Vehicle Setup
- Upload ID document and vehicle photo on `/dashboard/driver/vehicles/add`
- Save ID document to `driver_profiles.id_document_url`
- Save vehicle photo to `vehicles.vehicle_photo_url`
- Create vehicle with `verification_status = 'pending'`

### Driver Dashboard
- Show payment proof banner until payment is uploaded
- Show verification-in-progress banner after proof upload
- Show vehicle CTA after payment is approved
- Unlock route access only after payment, ID, and vehicle are approved

### Member Signup
- Basic account details only on `/register?type=member`
- Payment reference generated at signup
- Auto-login after signup
- Redirect to `/dashboard/member`

## Files That Still Match The Current Flow

- `app/register/RegisterClient.tsx`
- `app/dashboard/driver/vehicles/add/page.tsx`
- `app/dashboard/driver/page.tsx`
- `lib/auth/actions.ts`
- `app/payment/upload/page.tsx`

## Files That Previously Caused Confusion

- `docs/steering/registration-flow.md`
- `docs/steering/registration-page-updates-needed.md`
- `README.md`

## Notes

- The older "ID + selfie during signup" approach is no longer the source of truth
- The driver onboarding path is now split across signup, vehicle setup, and dashboard payment review
