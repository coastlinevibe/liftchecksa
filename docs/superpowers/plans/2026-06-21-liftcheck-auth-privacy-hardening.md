# LiftCheckSA Authorization and Privacy Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove active `group_admin` access, stop destructive logout behavior, split member-facing route data from admin review data, and hide Zii/Bluetooth from the active MVP without changing the chat model or database tables.

**Architecture:** Keep the recurring-route tables and flows intact. Tighten authorization in app code and forward migrations, split route-detail loading into safe member/public versus admin-review shapes, and remove legacy MVP surface area from navigation and copy while preserving the underlying files for later cleanup.

**Tech Stack:** Next.js App Router, React Server Components, Supabase Postgres/RLS, storage buckets, TypeScript, ESLint.

---

### Task 1: Remove active `group_admin` authorization and destructive logout cleanup

**Files:**
- Modify: `lib/auth/routing.ts`
- Modify: `lib/auth/actions.ts`
- Modify: `app/admin/page.tsx`
- Modify: `app/admin/routes/[routeId]/page.tsx`
- Modify: `app/admin/verifications/page.tsx`
- Modify: `app/admin/verifications/[id]/page.tsx`
- Modify: `app/admin/payments/[paymentId]/proof/route.ts`
- Modify: `app/admin/driver-subscriptions/[driverProfileId]/proof/route.ts`
- Modify: `supabase/migrations/*_remove_group_admin_from_active_policies.sql`

- [ ] **Step 1: Write the failing test or verification target**

```ts
// Auth helper expectation
expect(isAdminRole('group_admin')).toBe(false);
expect(isAdminRole('platform_admin')).toBe(true);
```

- [ ] **Step 2: Run the targeted check and confirm the current behavior is unsafe**

Run: `npm.cmd run lint`
Expected: current code still contains legacy `group_admin` references and logout deletion logic to remove.

- [ ] **Step 3: Implement the minimal change**

```ts
export function isAdminRole(role?: string | null) {
  return role === ADMIN_ROLE;
}
```

```ts
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { success: true, redirectUrl: '/' };
}
```

- [ ] **Step 4: Verify the change**

Run: `npm.cmd run lint`
Expected: no remaining active app code path grants `group_admin` admin access; logout no longer deletes route chats or other rows.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/routing.ts lib/auth/actions.ts app/admin/page.tsx app/admin/routes/[routeId]/page.tsx app/admin/verifications/page.tsx app/admin/verifications/[id]/page.tsx app/admin/payments/[paymentId]/proof/route.ts app/admin/driver-subscriptions/[driverProfileId]/proof/route.ts supabase/migrations/*_remove_group_admin_from_active_policies.sql
git commit -m "fix: harden admin auth and logout integrity"
```

### Task 2: Split member-facing route data from admin review data

**Files:**
- Modify: `lib/routes/actions.ts`
- Modify: `app/routes/[routeId]/page.tsx`
- Modify: `app/dashboard/driver/routes/[routeId]/page.tsx`
- Modify: `app/admin/routes/[routeId]/page.tsx`

- [ ] **Step 1: Write the failing test or contract check**

```ts
// Member-facing detail shape must not contain private verification fields.
expect(memberDetail.assignments[0]).not.toHaveProperty('id_document_url');
expect(memberDetail.assignments[0]).not.toHaveProperty('driver_phone');
```

- [ ] **Step 2: Run the targeted check and confirm the current data shape leaks private fields**

Run: `npm.cmd run lint`
Expected: route detail loaders still return private fields to member-facing code.

- [ ] **Step 3: Implement the minimal change**

```ts
export async function getRouteDetail(routeId: string) {
  // member/public-safe route shape only
}

export async function getAdminRouteReviewDetail(routeId: string) {
  // private verification fields returned only after admin auth
}
```

- [ ] **Step 4: Update the route pages to use the correct loader**

```ts
const detail = await getRouteDetail(routeId);
const adminDetail = await getAdminRouteReviewDetail(routeId);
```

- [ ] **Step 5: Verify**

Run: `npm.cmd run build`
Expected: member pages render without private document URLs; admin page still shows verification data.

- [ ] **Step 6: Commit**

```bash
git add lib/routes/actions.ts app/routes/[routeId]/page.tsx app/dashboard/driver/routes/[routeId]/page.tsx app/admin/routes/[routeId]/page.tsx
git commit -m "fix: separate route review data from member views"
```

### Task 3: Hide Zii/Bluetooth from the active MVP

**Files:**
- Modify: `app/settings/page.tsx`
- Modify: `app/dashboard/member/page.tsx`
- Modify: `app/page.tsx`
- Modify: `app/help/page.tsx`
- Modify: `app/settings/zii/page.tsx`
- Modify: `app/settings/_lib.ts`

- [ ] **Step 1: Write the failing UI expectation**

```ts
expect(screen.queryByText('Zii Verify')).not.toBeInTheDocument();
expect(screen.queryByText('Bluetooth Verify')).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the targeted check and confirm the active MVP still advertises Zii**

Run: `npm.cmd run lint`
Expected: current copy and navigation still expose Zii/Bluetooth.

- [ ] **Step 3: Implement the minimal change**

```tsx
{false ? <Link href="/settings/zii">...</Link> : null}
```

```tsx
<div className="text-xs text-slate-500">Offline verification is not part of the active MVP.</div>
```

- [ ] **Step 4: Verify the app still builds with the file present**

Run: `npm.cmd run build`
Expected: Zii page remains in the repo but is no longer surfaced in the active MVP UI.

- [ ] **Step 5: Commit**

```bash
git add app/settings/page.tsx app/dashboard/member/page.tsx app/page.tsx app/help/page.tsx app/settings/zii/page.tsx app/settings/_lib.ts
git commit -m "fix: hide inactive zii mvp surfaces"
```

### Task 4: Fix avatar lint and verify the PR

**Files:**
- Modify: `app/settings/profile/ProfileEditor.tsx`
- Modify: `app/dashboard/driver/page.tsx`
- Modify: `app/dashboard/member/page.tsx`
- Modify: `lib/settings/actions.ts`

- [ ] **Step 1: Write the failing check for the lint issue**

```ts
// ProfileEditor should not sync state from props in an effect for the avatar preview.
```

- [ ] **Step 2: Implement the minimal cleanup**

```tsx
const previewUrl = profilePhoto ? URL.createObjectURL(profilePhoto) : profilePhotoUrl || '';
```

- [ ] **Step 3: Verify**

Run: `npm.cmd run lint && npm.cmd run build`
Expected: lint and production build both pass.

- [ ] **Step 4: Commit**

```bash
git add app/settings/profile/ProfileEditor.tsx app/dashboard/driver/page.tsx app/dashboard/member/page.tsx lib/settings/actions.ts
git commit -m "fix: add profile avatars and clean settings editor"
```

