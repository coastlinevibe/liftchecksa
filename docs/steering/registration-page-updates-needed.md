# Registration Page Notes

## Status

Obsolete. The old file-upload note below no longer reflects the official driver signup flow.

## Current Truth

- Driver signup is basic-account-only on `/register?type=driver`
- The driver uploads payment proof from `/payment/upload`
- Vehicle setup happens later on `/dashboard/driver/vehicles/add`
- The vehicle page uploads the ID document and vehicle image together

## Why Keep This File

- It documents the old implementation request
- It should not be used as the source of truth for the signup flow
