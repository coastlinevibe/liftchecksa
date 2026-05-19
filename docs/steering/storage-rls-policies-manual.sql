-- =====================================================
-- Supabase Storage RLS Policies
-- Add these through Supabase Dashboard > Storage > [Bucket] > Policies
-- =====================================================

-- =====================================================
-- SIMPLIFIED POLICIES (Use these in the UI)
-- =====================================================

-- For each bucket (id-documents, profile-photos, payment-proofs, vehicle-photos)
-- Add these 2 policies through the Storage UI:

-- =====================================================
-- ID DOCUMENTS BUCKET
-- =====================================================

-- Policy 1: Allow authenticated uploads
-- Policy name: Allow authenticated uploads
-- Allowed operation: INSERT
-- Target roles: authenticated
-- WITH CHECK expression:
bucket_id = 'id-documents'

-- Policy 2: Allow authenticated reads
-- Policy name: Allow authenticated reads
-- Allowed operation: SELECT
-- Target roles: authenticated
-- USING expression:
bucket_id = 'id-documents'

-- =====================================================
-- PROFILE PHOTOS BUCKET
-- =====================================================

-- Policy 1: Allow authenticated uploads
-- Policy name: Allow authenticated uploads
-- Allowed operation: INSERT
-- Target roles: authenticated
-- WITH CHECK expression:
bucket_id = 'profile-photos'

-- Policy 2: Allow authenticated reads
-- Policy name: Allow authenticated reads
-- Allowed operation: SELECT
-- Target roles: authenticated
-- USING expression:
bucket_id = 'profile-photos'

-- =====================================================
-- PAYMENT PROOFS BUCKET
-- =====================================================

-- Policy 1: Allow authenticated uploads
-- Policy name: Allow authenticated uploads
-- Allowed operation: INSERT
-- Target roles: authenticated
-- WITH CHECK expression:
bucket_id = 'payment-proofs'

-- Policy 2: Allow authenticated reads
-- Policy name: Allow authenticated reads
-- Allowed operation: SELECT
-- Target roles: authenticated
-- USING expression:
bucket_id = 'payment-proofs'

-- =====================================================
-- VEHICLE PHOTOS BUCKET
-- =====================================================

-- Policy 1: Allow authenticated uploads
-- Policy name: Allow authenticated uploads
-- Allowed operation: INSERT
-- Target roles: authenticated
-- WITH CHECK expression:
bucket_id = 'vehicle-photos'

-- Policy 2: Allow authenticated reads
-- Policy name: Allow authenticated reads
-- Allowed operation: SELECT
-- Target roles: authenticated
-- USING expression:
bucket_id = 'vehicle-photos'

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. These simplified policies allow any authenticated user to upload/view files
-- 2. We can add folder-level security later if needed
-- 3. Max file size: 5MB (set in bucket config)
-- 4. Allowed MIME types set in bucket config
-- 5. File paths should be: {user_id}/{filename} for organization

-- =====================================================
-- ADVANCED POLICIES (Optional - for later)
-- =====================================================
-- If you want to restrict uploads to user's own folder, use these instead:

-- For INSERT policies, use:
-- bucket_id = 'bucket-name' AND (storage.foldername(name))[1] = auth.uid()::text

-- For SELECT policies (private documents), use:
-- bucket_id = 'bucket-name' AND 
-- ((storage.foldername(name))[1] = auth.uid()::text OR 
--  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'platform_admin'))

-- For SELECT policies (public documents), use:
-- bucket_id = 'bucket-name'
