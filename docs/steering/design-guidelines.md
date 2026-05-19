---
inclusion: auto
---

# LiftCheck S.A Design Guidelines

## Design Principles

### 1. Mobile-First Ultra-Compact Layout

**CRITICAL**: This is the most important design principle. The user has corrected this 2-3 times.

#### Container Sizing
```tsx
// ✅ CORRECT - Always use max-w-md
<div className="max-w-md mx-auto">

// ❌ WRONG - Never use larger containers
<div className="max-w-lg mx-auto">  // Too wide!
<div className="max-w-xl mx-auto">  // Way too wide!
```

#### Padding Rules
```tsx
// ✅ CORRECT - Minimal padding
className="p-2.5"  // 10px - Very tight
className="p-3"    // 12px - Standard
className="p-4"    // 16px - Maximum allowed

// ❌ WRONG - Too much padding
className="p-6"    // 24px - Too spacious
className="p-8"    // 32px - Wasteful
```

#### Spacing Rules
```tsx
// ✅ CORRECT - Tight spacing
className="gap-2"   // 8px between items
className="gap-3"   // 12px between items
className="mb-2"    // 8px margin bottom
className="mb-3"    // 12px margin bottom

// ❌ WRONG - Too much space
className="gap-4"   // 16px - Too loose
className="gap-6"   // 24px - Wasteful
className="mb-6"    // 24px - Too much
```

#### Text Sizing
```tsx
// ✅ CORRECT - Small, compact text
className="text-[10px]"  // Extra small labels
className="text-xs"      // 12px - Standard small
className="text-sm"      // 14px - Standard body
className="text-base"    // 16px - Headings only

// ❌ WRONG - Text too large
className="text-lg"      // 18px - Too big
className="text-xl"      // 20px - Way too big
```

### 2. Color Palette

#### Primary Colors
```tsx
// Emerald Green - Trust, Safety, Success
bg-emerald-50    // Very light backgrounds
bg-emerald-100   // Light backgrounds
bg-emerald-500   // Primary buttons, accents
bg-emerald-600   // Hover states
text-emerald-600 // Primary text
text-emerald-700 // Dark text
border-emerald-200 // Borders
border-emerald-500 // Active borders
```

#### Secondary Colors
```tsx
// Slate/Navy - Professional, Clean
bg-slate-50      // Light backgrounds
bg-slate-100     // Card backgrounds
bg-slate-700     // Dark elements
bg-slate-800     // Darker elements
bg-slate-900     // Darkest backgrounds (landing page)
text-slate-600   // Secondary text
text-slate-700   // Body text
text-slate-900   // Headings
border-slate-200 // Light borders
border-slate-300 // Standard borders
```

#### Accent Colors
```tsx
// Blue - Information
bg-blue-50       // Info backgrounds
text-blue-800    // Info text
border-blue-200  // Info borders

// Red - Warnings, Errors
bg-red-50        // Error backgrounds
text-red-800     // Error text
border-red-200   // Error borders

// Yellow - Alerts
bg-yellow-50     // Alert backgrounds
text-yellow-800  // Alert text
border-yellow-200 // Alert borders
```

### 3. Component Patterns

#### Buttons
```tsx
// Primary Button
<button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg text-sm font-semibold">
  Primary Action
</button>

// Secondary Button
<button className="w-full bg-white border-2 border-slate-200 text-slate-900 py-3 rounded-lg text-sm font-semibold">
  Secondary Action
</button>

// Disabled Button
<button 
  disabled 
  className="w-full bg-slate-300 text-slate-500 py-3 rounded-lg text-sm font-semibold cursor-not-allowed"
>
  Disabled
</button>
```

#### Input Fields
```tsx
// Standard Input
<input
  type="text"
  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
  placeholder="Enter text"
/>

// Input with Icon
<div className="relative">
  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
  <input
    type="email"
    className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
    placeholder="your.email@example.com"
  />
</div>
```

#### Cards
```tsx
// Standard Card
<div className="bg-white rounded-xl border border-slate-200 p-4">
  <h3 className="text-base font-bold text-slate-900 mb-3">Card Title</h3>
  <p className="text-xs text-slate-600">Card content</p>
</div>

// Compact Card (preferred)
<div className="bg-white rounded-lg border border-slate-200 p-3">
  <h3 className="text-sm font-semibold text-slate-900 mb-2">Card Title</h3>
  <p className="text-xs text-slate-600">Card content</p>
</div>
```

#### Alert Boxes
```tsx
// Success Alert
<div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
  <p className="text-xs text-emerald-800">
    <strong>Success:</strong> Your action was completed.
  </p>
</div>

// Error Alert
<div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
  <p className="text-xs text-red-800">Error message here</p>
</div>

// Info Alert
<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
  <p className="text-xs text-blue-800">
    <strong>Info:</strong> Important information.
  </p>
</div>
```

#### Badges
```tsx
// Status Badges
<span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-semibold">
  Verified
</span>

<span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-semibold">
  Pending
</span>

<span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-semibold">
  Rejected
</span>
```

### 4. Layout Patterns

#### Page Structure
```tsx
export default function PageName() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - if needed */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 py-4 max-w-md mx-auto">
          <h1 className="text-xl font-bold text-slate-900">Page Title</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 max-w-md mx-auto">
        {/* Page content here */}
      </div>
    </div>
  );
}
```

#### Landing Page (Dark Theme)
```tsx
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <div className="px-3 py-4 max-w-md mx-auto">
        {/* Dark theme content */}
      </div>
    </div>
  );
}
```

### 5. Icon Usage

```tsx
import { Shield, CheckCircle, AlertCircle, User, Car } from 'lucide-react';

// Standard icon sizes
<Shield className="w-4 h-4" />  // Small icons
<Shield className="w-5 h-5" />  // Medium icons
<Shield className="w-6 h-6" />  // Large icons

// Icon with text
<div className="flex items-center gap-2">
  <CheckCircle className="w-4 h-4 text-emerald-600" />
  <span className="text-sm text-slate-700">Verified</span>
</div>
```

### 6. Responsive Behavior

```tsx
// Mobile-first (default)
<div className="grid grid-cols-1 gap-2">

// Tablet and up (optional)
<div className="grid grid-cols-1 md:grid-cols-2 gap-2">

// Desktop (rarely needed)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
```

### 7. Common Mistakes to Avoid

❌ **DON'T:**
- Use large containers (max-w-lg, max-w-xl)
- Add excessive padding (p-6, p-8)
- Use large text (text-lg, text-xl) for body content
- Create spacious layouts with gap-6, gap-8
- Waste vertical space
- Use complex gradients or shadows
- Add unnecessary animations

✅ **DO:**
- Keep everything compact (max-w-md)
- Use minimal padding (p-2.5, p-3, p-4 max)
- Use small text (text-xs, text-sm)
- Keep spacing tight (gap-2, gap-3)
- Maximize information density
- Use simple, clean designs
- Focus on functionality over aesthetics

### 8. Form Design

```tsx
// Compact Form
<form className="space-y-3">
  <div>
    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
      Field Label
    </label>
    <input
      type="text"
      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
    />
  </div>
  
  <button
    type="submit"
    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg text-sm font-semibold"
  >
    Submit
  </button>
</form>
```

### 9. Loading States

```tsx
// Button Loading
<button
  disabled={loading}
  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-lg text-sm font-semibold"
>
  {loading ? 'Loading...' : 'Submit'}
</button>
```

### 10. Empty States

```tsx
<div className="text-center py-8">
  <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full mb-3">
    <Package className="w-6 h-6 text-slate-400" />
  </div>
  <h3 className="text-sm font-semibold text-slate-900 mb-1">No items found</h3>
  <p className="text-xs text-slate-600">Get started by creating your first item.</p>
</div>
```

## Design Checklist

Before submitting any new page or component, verify:

- [ ] Container uses `max-w-md`
- [ ] Padding is `p-2.5`, `p-3`, or `p-4` maximum
- [ ] Text sizes are `text-xs`, `text-sm`, or `text-base` (headings only)
- [ ] Spacing uses `gap-2`, `gap-3`, `mb-2`, `mb-3`
- [ ] Colors follow the emerald/slate palette
- [ ] No wasted vertical space
- [ ] Mobile-first responsive design
- [ ] Buttons are full-width on mobile
- [ ] Icons are appropriately sized (w-4 h-4 or w-5 h-5)
- [ ] Forms are compact with minimal spacing
