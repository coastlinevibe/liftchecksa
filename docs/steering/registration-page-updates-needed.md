# Registration Page Notes

## Status

This note is obsolete. The file upload work described here has already been implemented, but the current official driver signup flow no longer uploads ID/selfie during `/register`.

## Current Truth

- Driver signup is basic-account-only on `/register?type=driver`
- The driver is redirected to `/dashboard/driver/vehicles/add`
- ID document upload now happens on the vehicle setup page
- Vehicle photo upload also happens on the vehicle setup page

## Why Keep This File

- It documents the old implementation request
- It should not be used as the source of truth for the signup flow
