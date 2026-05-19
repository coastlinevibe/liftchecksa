# LiftCheck Setup Guide

## 1. Supabase Setup

### Step 1: Run the Database Schema

1. Go to your Supabase project: https://supabase.com/dashboard/project/bfouoswqvgwentswoorl
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `supabase-schema.sql`
5. Paste into the SQL editor
6. Click **Run** to execute

This will create:
- All database tables
- Row Level Security (RLS) policies
- Indexes
- Functions and triggers

### Step 2: Configure Storage Buckets

1. Go to **Storage** in the left sidebar
2. Create the following buckets:

**Public Buckets:**
- `profile-photos` (Public)
- `vehicle-photos` (Public)

**Private Buckets:**
- `id-documents` (Private)
- `licence-documents` (Private)
- `proof-of-address` (Private)
- `payment-proofs` (Private)
- `chat-images` (Private)
- `evidence-uploads` (Private)

**Storage Policies:**

For public buckets, add these policies:
```sql
-- Allow authenticated users to upload their own files
CREATE POLICY "Users can upload own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-photos');
```

### Step 3: Enable Authentication

1. Go to **Authentication** > **Providers**
2. Enable **Email** provider
3. Configure email templates (optional)

### Step 4: Environment Variables

Your `.env.local` file should have:
```
NEXT_PUBLIC_SUPABASE_URL=https://bfouoswqvgwentswoorl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 2. Test the Connection

Run the development server:
```bash
npm run dev
```

Open http://localhost:3000 and check the browser console for any Supabase connection errors.

## 3. Create First Admin User

After setting up, you'll need to create an admin user manually:

1. Go to **Authentication** > **Users** in Supabase
2. Click **Add User**
3. Create a user with email/password
4. Go to **Table Editor** > **profiles**
5. Find the user and update their `role` to `platform_admin`

## 4. Next Steps

Once Supabase is connected:
1. Test user registration
2. Test login/logout
3. Upload test documents for driver verification
4. Create test trips
5. Test the full booking flow

## 5. Troubleshooting

### Connection Issues
- Check that your Supabase URL and anon key are correct
- Verify your project is not paused (free tier pauses after inactivity)
- Check browser console for CORS errors

### RLS Policy Issues
- If you can't read/write data, check RLS policies are enabled
- Verify policies match the user's auth.uid()
- Use Supabase SQL editor to test queries directly

### Storage Issues
- Verify bucket names match exactly
- Check storage policies are set correctly
- Ensure file sizes are within limits (5MB for most uploads)

## 6. Production Checklist

Before deploying:
- [ ] Update `.env.local` with production Supabase URL
- [ ] Set up proper email templates
- [ ] Configure custom SMTP (optional)
- [ ] Set up database backups
- [ ] Review and test all RLS policies
- [ ] Set up monitoring and alerts
- [ ] Configure rate limiting
- [ ] Add proper error tracking (Sentry, etc.)
