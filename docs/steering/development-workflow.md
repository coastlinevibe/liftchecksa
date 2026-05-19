---
inclusion: auto
---

# LiftCheck S.A Development Workflow

## Development Environment Setup

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Git for version control
- Modern web browser (Chrome/Edge recommended)
- Supabase account (already set up)

### Initial Setup

```bash
# Navigate to project directory
cd "e:\wind new\Liftcheck\liftcheck"

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:3000
```

### Environment Variables

Ensure `.env.local` contains:

```env
NEXT_PUBLIC_SUPABASE_URL=https://bfouoswqvgwentswoorl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NODE_TLS_REJECT_UNAUTHORIZED=0  # Development only - SSL certificate workaround
```

**Important**: The `NODE_TLS_REJECT_UNAUTHORIZED=0` setting is for development only to bypass SSL certificate issues. Remove this in production!

## Project Structure

```
liftcheck/
├── .kiro/
│   └── steering/              # Documentation (this folder)
├── app/                       # Next.js App Router
│   ├── page.tsx              # Landing page
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles
│   ├── login/                # Auth pages
│   ├── register/
│   ├── dashboard/            # User dashboards
│   │   ├── member/
│   │   └── driver/
│   ├── trips/                # Trip pages
│   ├── messages/             # Messaging
│   ├── admin/                # Admin panel
│   └── ...                   # Other pages
├── lib/
│   ├── auth/
│   │   └── actions.ts        # Auth server actions
│   ├── trips/
│   │   └── actions.ts        # Trip server actions
│   ├── supabase/
│   │   ├── client.ts         # Browser client
│   │   └── server.ts         # Server client
│   └── types/
│       ├── database.ts       # Custom types
│       └── database.types.ts # Generated types
├── public/                   # Static assets
│   └── *.svg                # Icons and images
├── middleware.ts             # Route protection
├── .env.local               # Environment variables
├── next.config.ts           # Next.js config
├── tailwind.config.ts       # Tailwind config
├── tsconfig.json            # TypeScript config
└── package.json             # Dependencies
```

## Development Workflow

### 1. Creating New Pages

#### Step 1: Create the Page File

```tsx
// app/new-page/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-4 py-4 max-w-md mx-auto">
        <Link href="/dashboard" className="inline-flex items-center text-slate-600 text-sm mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Link>
        
        <h1 className="text-xl font-bold text-slate-900 mb-4">Page Title</h1>
        
        {/* Page content */}
      </div>
    </div>
  );
}
```

#### Step 2: Add Navigation Links

Update relevant pages to link to your new page:

```tsx
<Link href="/new-page" className="...">
  Go to New Page
</Link>
```

#### Step 3: Test the Page

1. Save the file
2. Browser auto-refreshes (hot reload)
3. Navigate to `/new-page`
4. Verify layout and functionality

### 2. Creating Server Actions

#### Step 1: Create Action File

```tsx
// lib/feature/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createItem(formData: {
  name: string;
  description: string;
}) {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  // IMPORTANT: If working with driver-related data, get driver_profiles.id first
  // const { data: driverProfile } = await supabase
  //   .from('driver_profiles')
  //   .select('id')
  //   .eq('user_id', user.id)
  //   .single();
  //
  // if (!driverProfile) {
  //   return { error: 'Driver profile not found' };
  // }

  // Insert data
  const { data, error } = await supabase
    .from('table_name')
    .insert({
      user_id: user.id,  // Or driverProfile.id for driver-related tables
      name: formData.name,
      description: formData.description,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // Revalidate cache
  revalidatePath('/relevant-page');

  return { success: true, data };
}
```

**CRITICAL**: When working with `vehicles` or `trips` tables, always use `driver_profiles.id`, not `user.id`:

```typescript
// ✅ Correct pattern for driver-related tables
const { data: driverProfile } = await supabase
  .from('driver_profiles')
  .select('id')
  .eq('user_id', user.id)
  .single();

// Use driverProfile.id for vehicles and trips
const { data } = await supabase
  .from('vehicles')
  .insert({ driver_id: driverProfile.id, ... });

// ❌ Wrong pattern - will fail!
const { data } = await supabase
  .from('vehicles')
  .insert({ driver_id: user.id, ... });  // RLS policy error!
```

#### Step 2: Use Action in Component

```tsx
'use client';

import { useState } from 'react';
import { createItem } from '@/lib/feature/actions';

export default function MyComponent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await createItem({
      name: 'Item name',
      description: 'Item description',
    });

    if (result.error) {
      setError(result.error);
    } else {
      // Handle success
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

### 3. Database Changes

#### Using Kiro Power (Recommended)

```typescript
// 1. Activate Supabase power
kiroPowers.activate("supabase-hosted")

// 2. Apply migration
kiroPowers.use({
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "apply_migration",
  arguments: {
    project_id: "bfouoswqvgwentswoorl",
    name: "add_new_column",
    query: `
      ALTER TABLE table_name 
      ADD COLUMN new_column VARCHAR(100);
    `
  }
})

// 3. Check for security issues
kiroPowers.use({
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "get_advisors",
  arguments: {
    project_id: "bfouoswqvgwentswoorl",
    type: "security"
  }
})

// 4. Generate new types
kiroPowers.use({
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "generate_typescript_types",
  arguments: {
    project_id: "bfouoswqvgwentswoorl"
  }
})
```

#### Update Local Types

After generating types, update `lib/types/database.types.ts` with the new types.

### 4. Adding New Features

#### Feature Development Checklist

- [ ] Create database tables/columns if needed
- [ ] Add RLS policies for new tables
- [ ] Create server actions for data operations
- [ ] Build UI components
- [ ] Add navigation links
- [ ] Test authentication flow
- [ ] Test data operations
- [ ] Verify mobile responsiveness
- [ ] Check for console errors
- [ ] Test edge cases

#### Example: Adding a "Favorites" Feature

1. **Database**:
```sql
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, trip_id)
);

-- RLS
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own favorites" ON favorites
  FOR ALL USING (auth.uid() = user_id);
```

2. **Server Actions**:
```tsx
// lib/favorites/actions.ts
export async function addFavorite(tripId: string) { ... }
export async function removeFavorite(tripId: string) { ... }
export async function getFavorites() { ... }
```

3. **UI Component**:
```tsx
// components/FavoriteButton.tsx
export function FavoriteButton({ tripId }: { tripId: string }) { ... }
```

4. **Integration**:
```tsx
// app/trips/[id]/page.tsx
import { FavoriteButton } from '@/components/FavoriteButton';

// Add to trip details page
<FavoriteButton tripId={trip.id} />
```

### 5. Testing

#### Manual Testing Checklist

**Authentication:**
- [ ] Registration works (member & driver)
- [ ] Login works
- [ ] Logout works
- [ ] Password reset works
- [ ] Protected routes redirect to login
- [ ] Role-based redirects work

**Data Operations:**
- [ ] Create operations work
- [ ] Read operations work
- [ ] Update operations work
- [ ] Delete operations work
- [ ] RLS policies enforce correctly
- [ ] Error handling works

**UI/UX:**
- [ ] Mobile layout is compact
- [ ] Desktop layout works
- [ ] Forms validate correctly
- [ ] Loading states show
- [ ] Error messages display
- [ ] Success messages display
- [ ] Navigation works
- [ ] Back buttons work

**Performance:**
- [ ] Pages load quickly
- [ ] No console errors
- [ ] Images load properly
- [ ] No layout shifts

### 6. Debugging

#### Common Issues

**Issue: "Not authenticated" error**
```tsx
// Check if user is logged in
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);

// Check if session exists
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
```

**Issue: RLS policy blocking query**
```tsx
// Test query without RLS (in Supabase SQL editor)
SELECT * FROM table_name;

// Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'table_name';

// Verify user ID matches
SELECT auth.uid();
```

**Issue: Type errors**
```bash
# Regenerate types
npm run types:generate

# Or use Kiro Power
kiroPowers.use({
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "generate_typescript_types",
  arguments: { project_id: "bfouoswqvgwentswoorl" }
})
```

**Issue: Middleware redirect loop**
```tsx
// Check middleware.ts
// Ensure protected routes are correctly defined
// Verify redirect logic doesn't create loops
```

#### Browser DevTools

**Console Tab:**
- Check for JavaScript errors
- View console.log outputs
- Monitor network requests

**Network Tab:**
- View API requests
- Check request/response data
- Monitor loading times

**Application Tab:**
- View localStorage
- Check cookies
- Inspect service workers (for PWA)

### 7. Code Style

#### TypeScript

```tsx
// ✅ Use TypeScript types
interface FormData {
  name: string;
  email: string;
}

// ✅ Use async/await
const result = await fetchData();

// ✅ Handle errors
try {
  await operation();
} catch (error) {
  console.error(error);
}

// ❌ Don't use 'any'
const data: any = {};  // Bad

// ✅ Use proper types
const data: FormData = {};  // Good
```

#### React

```tsx
// ✅ Use functional components
export default function Component() { ... }

// ✅ Use hooks
const [state, setState] = useState();
const data = useEffect(() => { ... });

// ✅ Use 'use client' for client components
'use client';

// ✅ Use 'use server' for server actions
'use server';
```

#### Tailwind CSS

```tsx
// ✅ Use utility classes
<div className="p-3 bg-white rounded-lg">

// ✅ Use responsive classes
<div className="grid grid-cols-1 md:grid-cols-2">

// ❌ Don't use inline styles
<div style={{ padding: '12px' }}>  // Bad

// ✅ Use Tailwind classes
<div className="p-3">  // Good
```

### 8. Git Workflow

```bash
# Check status
git status

# Add changes
git add .

# Commit with message
git commit -m "Add favorites feature"

# Push to GitHub
git push origin main

# Create feature branch (optional)
git checkout -b feature/favorites
git push origin feature/favorites
```

### 9. Deployment

#### Vercel (Recommended)

1. **Connect GitHub Repository**
   - Go to vercel.com
   - Import your GitHub repo
   - Vercel auto-detects Next.js

2. **Configure Environment Variables**
   - Add `NEXT_PUBLIC_SUPABASE_URL`
   - Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Visit your live URL

4. **Auto-Deploy**
   - Every push to main branch auto-deploys
   - Preview deployments for PRs

### 10. Performance Optimization

#### Image Optimization

```tsx
import Image from 'next/image';

// ✅ Use Next.js Image component
<Image 
  src="/image.jpg" 
  alt="Description"
  width={300}
  height={200}
  priority  // For above-fold images
/>

// ❌ Don't use regular img tag
<img src="/image.jpg" />  // Bad
```

#### Code Splitting

```tsx
// ✅ Use dynamic imports for large components
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>
});
```

#### Database Queries

```tsx
// ✅ Select only needed columns
.select('id, name, email')

// ❌ Don't select all columns
.select('*')  // Bad if you only need a few

// ✅ Use pagination
.range(0, 9)  // First 10 items

// ✅ Use indexes (already set up)
// Queries on indexed columns are faster
```

## Best Practices

1. **Always test locally before pushing**
2. **Use TypeScript types for everything**
3. **Follow the design guidelines** (see design-guidelines.md)
4. **Keep components small and focused**
5. **Use server actions for data operations**
6. **Never expose secrets in client code**
7. **Test on mobile devices** (or use browser DevTools)
8. **Handle loading and error states**
9. **Validate user input**
10. **Write clear commit messages**

## Quick Reference

### Common Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database
# Use Kiro Power for database operations

# Git
git status           # Check status
git add .            # Stage all changes
git commit -m "msg"  # Commit changes
git push             # Push to remote
```

### File Locations

- Pages: `app/*/page.tsx`
- Server Actions: `lib/*/actions.ts`
- Types: `lib/types/*.ts`
- Supabase Clients: `lib/supabase/*.ts`
- Middleware: `middleware.ts`
- Styles: `app/globals.css`
- Config: `next.config.ts`, `tailwind.config.ts`

### Useful Links

- Next.js Docs: https://nextjs.org/docs
- Supabase Docs: https://supabase.com/docs
- Tailwind Docs: https://tailwindcss.com/docs
- Lucide Icons: https://lucide.dev/icons
- TypeScript Docs: https://www.typescriptlang.org/docs
