# FireCFO Design System Reference

**Version:** 1.0
**Last Updated:** November 2025
**Framework:** Next.js 16 + Tailwind CSS 4 + shadcn/ui
**Design Philosophy:** Modern, accessible, financially-focused UI with Indian market context

---

## Table of Contents

1. [Colors](#colors)
2. [Typography](#typography)
3. [Spacing](#spacing)
4. [Border Radius](#border-radius)
5. [Shadows & Elevation](#shadows--elevation)
6. [Components](#components)
7. [Layout Patterns](#layout-patterns)
8. [Interaction Patterns](#interaction-patterns)
9. [Animation & Motion](#animation--motion)
10. [Accessibility Standards](#accessibility-standards)
11. [Icon System](#icon-system)
12. [Currency & Number Formatting](#currency--number-formatting)

---

## Colors

### Color System Overview
FireCFO uses the **OKLCH color space** for perceptually uniform colors with excellent dark mode support.

### Semantic Colors (Light Mode)

| Token | OKLCH Value | Usage | Contrast Ratio |
|-------|------------|-------|----------------|
| `--background` | `oklch(1 0 0)` | Page backgrounds | - |
| `--foreground` | `oklch(0.129 0.042 264.695)` | Primary text | 21:1 (AAA) |
| `--card` | `oklch(1 0 0)` | Card backgrounds | - |
| `--card-foreground` | `oklch(0.129 0.042 264.695)` | Card text | 21:1 (AAA) |
| `--primary` | `oklch(0.208 0.042 265.755)` | Primary actions | 12.6:1 (AAA) |
| `--primary-foreground` | `oklch(0.984 0.003 247.858)` | Text on primary | 12.6:1 (AAA) |
| `--secondary` | `oklch(0.968 0.007 247.896)` | Secondary actions | 1.4:1 |
| `--secondary-foreground` | `oklch(0.208 0.042 265.755)` | Text on secondary | 12.6:1 (AAA) |
| `--muted` | `oklch(0.968 0.007 247.896)` | Muted backgrounds | - |
| `--muted-foreground` | `oklch(0.554 0.046 257.417)` | Subtle text | 4.8:1 (AA) |
| `--accent` | `oklch(0.968 0.007 247.896)` | Accent highlights | - |
| `--accent-foreground` | `oklch(0.208 0.042 265.755)` | Text on accent | 12.6:1 (AAA) |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Destructive actions | 5.2:1 (AA+) |
| `--border` | `oklch(0.929 0.013 255.508)` | Borders | - |
| `--input` | `oklch(0.929 0.013 255.508)` | Input borders | - |
| `--ring` | `oklch(0.704 0.04 256.788)` | Focus rings | 3.8:1 (AA) |

### Semantic Colors (Dark Mode)

| Token | OKLCH Value | Usage |
|-------|------------|-------|
| `--background` | `oklch(0.129 0.042 264.695)` | Page backgrounds |
| `--foreground` | `oklch(0.984 0.003 247.858)` | Primary text |
| `--card` | `oklch(0.208 0.042 265.755)` | Card backgrounds |
| `--primary` | `oklch(0.929 0.013 255.508)` | Primary actions |
| `--secondary` | `oklch(0.279 0.041 260.031)` | Secondary actions |
| `--muted` | `oklch(0.279 0.041 260.031)` | Muted backgrounds |
| `--destructive` | `oklch(0.704 0.191 22.216)` | Destructive actions |
| `--border` | `oklch(1 0 0 / 10%)` | Borders (transparent) |
| `--input` | `oklch(1 0 0 / 15%)` | Input borders (transparent) |

### Chart Colors

**Light Mode:**
- `--chart-1`: `oklch(0.646 0.222 41.116)` - Orange
- `--chart-2`: `oklch(0.6 0.118 184.704)` - Teal
- `--chart-3`: `oklch(0.398 0.07 227.392)` - Blue
- `--chart-4`: `oklch(0.828 0.189 84.429)` - Yellow
- `--chart-5`: `oklch(0.769 0.188 70.08)` - Green

**Dark Mode:**
- `--chart-1`: `oklch(0.488 0.243 264.376)` - Purple
- `--chart-2`: `oklch(0.696 0.17 162.48)` - Green
- `--chart-3`: `oklch(0.769 0.188 70.08)` - Yellow-Green
- `--chart-4`: `oklch(0.627 0.265 303.9)` - Magenta
- `--chart-5`: `oklch(0.645 0.246 16.439)` - Orange

### Themed Color Palettes

FireCFO uses contextual color themes for different metric types and UI sections:

#### 1. Emerald Theme (Primary/AI Features)
```typescript
emerald: {
  border: 'border-emerald-200 dark:border-emerald-800',
  bg: 'bg-emerald-50 dark:bg-emerald-950',
  text: 'text-emerald-900 dark:text-emerald-100',
  accent: 'text-emerald-600 dark:text-emerald-400',
  iconBg: 'bg-emerald-100 dark:bg-emerald-900',
}
```
**Usage:** On-track status, AI chat features, primary CTAs, success states

#### 2. Violet Theme
```typescript
violet: {
  border: 'border-violet-200 dark:border-violet-800',
  bg: 'bg-violet-50 dark:bg-violet-950',
  text: 'text-violet-900 dark:text-violet-100',
  accent: 'text-violet-600 dark:text-violet-400',
  iconBg: 'bg-violet-100 dark:bg-violet-900',
}
```
**Usage:** Savings metrics, investment-related features

#### 3. Orange Theme
```typescript
orange: {
  border: 'border-orange-200 dark:border-orange-800',
  bg: 'bg-orange-50 dark:bg-orange-950',
  text: 'text-orange-900 dark:text-orange-100',
  accent: 'text-orange-600 dark:text-orange-400',
  iconBg: 'bg-orange-100 dark:bg-orange-900',
}
```
**Usage:** Income metrics, earning-related features

#### 4. Blue Theme
```typescript
blue: {
  border: 'border-blue-200 dark:border-blue-800',
  bg: 'bg-blue-50 dark:bg-blue-950',
  text: 'text-blue-900 dark:text-blue-100',
  accent: 'text-blue-600 dark:text-blue-400',
  iconBg: 'bg-blue-100 dark:bg-blue-900',
}
```
**Usage:** Corpus/net worth metrics, asset allocation

#### 5. Amber Theme
```typescript
amber: {
  border: 'border-amber-200 dark:border-amber-800',
  bg: 'bg-amber-50 dark:bg-amber-950',
  text: 'text-amber-900 dark:text-amber-100',
  accent: 'text-amber-600 dark:text-amber-400',
  iconBg: 'bg-amber-100 dark:bg-amber-900',
}
```
**Usage:** Warning states, behind-target status, expense metrics

#### 6. Additional Themes
- **Slate**: Neutral/general purpose
- **Indigo**: Alternative accent color
- **Cyan**: Alternative metrics color
- **Sky**: Alternative accent color

### Gradient Utilities

#### Text Gradients
```css
.text-gradient {
  @apply bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-purple-500;
}

.text-gradient-hero {
  @apply bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-green-400 to-purple-400;
}
```

#### Button Gradients
```css
.btn-gradient {
  @apply bg-gradient-to-r from-emerald-500 to-emerald-600
         hover:from-emerald-600 hover:to-emerald-700
         transition-all duration-300;
}

.btn-gradient-purple {
  @apply bg-gradient-to-r from-purple-500 to-purple-600
         hover:from-purple-600 hover:to-purple-700
         transition-all duration-300;
}
```

#### Glass Effects
```css
.glass {
  @apply bg-white/10 backdrop-blur-xl border border-white/20;
}

.glass-card {
  @apply bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl
         border border-white/20 shadow-2xl;
}
```

---

## Typography

### Font Families

**Primary Font:** Geist Sans
**Monospace Font:** Geist Mono

```typescript
// Font Configuration (app/layout.tsx)
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
```

### Type Scale

| Size Class | Font Size | Line Height | Usage |
|------------|-----------|-------------|-------|
| `text-xs` | 0.75rem (12px) | 1rem | Micro-copy, metadata, timestamps |
| `text-sm` | 0.875rem (14px) | 1.25rem | Secondary text, descriptions, input labels |
| `text-base` | 1rem (16px) | 1.5rem | Body text, default size |
| `text-lg` | 1.125rem (18px) | 1.75rem | Emphasis text, card subtitles |
| `text-xl` | 1.25rem (20px) | 1.75rem | Section headers |
| `text-2xl` | 1.5rem (24px) | 2rem | Page titles, modal headers |
| `text-3xl` | 1.875rem (30px) | 2.25rem | **Metric values**, key numbers |
| `text-4xl` | 2.25rem (36px) | 2.5rem | Hero headings |
| `text-5xl` | 3rem (48px) | 1 | Landing page headers |
| `text-6xl` | 3.75rem (60px) | 1 | Marketing hero text |

### Font Weights

| Weight Class | Value | Usage |
|--------------|-------|-------|
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Emphasized body text, labels |
| `font-semibold` | 600 | Subheadings, card titles |
| `font-bold` | 700 | Headings, metric values, CTAs |

### Letter Spacing

- `tracking-tight`: Headlines and display text
- `tracking-normal`: Body text (default)
- `tracking-wide`: Uppercase labels (`uppercase tracking-wide`)

### Typography Patterns

**Metric Value Display:**
```tsx
<p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
  ₹45.2 L
</p>
```

**Section Headers:**
```tsx
<h2 className="text-2xl font-bold text-foreground">
  FIRE Status
</h2>
```

**Muted Labels:**
```tsx
<p className="text-sm font-medium text-muted-foreground opacity-70">
  Monthly Expenses
</p>
```

**Card Descriptions:**
```tsx
<p className="text-sm text-muted-foreground">
  Your progress toward financial independence
</p>
```

---

## Spacing

### Base Unit
**8px** (0.5rem) - All spacing increments are based on this foundation.

### Spacing Scale

| Class | Value | Common Usage |
|-------|-------|--------------|
| `p-1` / `m-1` | 0.25rem (4px) | Tight spacing, icon gaps |
| `p-2` / `m-2` | 0.5rem (8px) | Small gaps, compact layouts |
| `p-3` / `m-3` | 0.75rem (12px) | Input padding, pill gaps |
| `p-4` / `m-4` | 1rem (16px) | Default component padding |
| `p-6` / `m-6` | 1.5rem (24px) | **Card padding (standard)** |
| `p-8` / `m-8` | 2rem (32px) | Large card padding, banner padding |
| `p-12` / `m-12` | 3rem (48px) | Section spacing |
| `p-16` / `m-16` | 4rem (64px) | Page margins |
| `p-24` / `m-24` | 6rem (96px) | Large section gaps |

### Gap Utilities

| Class | Value | Usage |
|-------|-------|-------|
| `gap-1` | 0.25rem (4px) | Icon + text |
| `gap-2` | 0.5rem (8px) | Inline elements |
| `gap-3` | 0.75rem (12px) | Pill selector, button groups |
| `gap-4` | 1rem (16px) | Card content sections |
| `gap-6` | 1.5rem (24px) | **Standard card gap** |
| `gap-8` | 2rem (32px) | Large content sections |

### Responsive Spacing Pattern
```tsx
// Example: Page container
<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  {/* Mobile: 16px, Tablet: 24px, Desktop: 32px */}
</div>
```

---

## Border Radius

### Radius Variables

```css
:root {
  --radius: 0.625rem; /* 10px - Base radius */
  --radius-sm: calc(var(--radius) - 4px); /* 6px */
  --radius-md: calc(var(--radius) - 2px); /* 8px */
  --radius-lg: var(--radius);             /* 10px */
  --radius-xl: calc(var(--radius) + 4px); /* 14px */
}
```

### Radius Scale

| Class | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 0.125rem (2px) | Subtle rounding |
| `rounded` | 0.25rem (4px) | Small elements |
| `rounded-md` | 0.375rem (6px) | Buttons, inputs |
| `rounded-lg` | 0.5rem (8px) | Small cards |
| `rounded-xl` | 0.75rem (12px) | **Standard cards, modals** |
| `rounded-2xl` | 1rem (16px) | Large cards, banners |
| `rounded-full` | 9999px | Pills, avatars, badges |

### Component Radius Patterns

- **Buttons**: `rounded-md` (6px)
- **Inputs**: `rounded-md` (6px)
- **Cards**: `rounded-xl` (12px)
- **Metric Cards**: `rounded-xl` (12px)
- **Banners**: `rounded-2xl` (16px)
- **Modals**: `rounded-lg` (8px) on mobile, same on desktop
- **Pills/Badges**: `rounded-full`
- **Icon Containers**: `rounded-lg` (8px) or `rounded-full`

---

## Shadows & Elevation

### Shadow Scale

| Class | Value | Usage |
|-------|-------|-------|
| `shadow-xs` | Custom subtle shadow | Input fields |
| `shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | Small cards |
| `shadow` | `0 1px 3px 0 rgb(0 0 0 / 0.1)` | Default cards |
| `shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1)` | Raised elements |
| `shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1)` | **Modals, hover cards** |
| `shadow-xl` | `0 20px 25px -5px rgb(0 0 0 / 0.1)` | Floating elements |
| `shadow-2xl` | `0 25px 50px -12px rgb(0 0 0 / 0.25)` | **Chat panel, popovers** |

### Colored Shadows

```tsx
// Emerald shadow (selected pills)
className="shadow-lg shadow-emerald-200 dark:shadow-emerald-950/50"

// Orange notification pulse
className="shadow-orange-500/50 animate-pulse"
```

### Elevation Hierarchy

1. **Base Layer (0dp)**: Page background
2. **Raised Layer (2dp)**: Cards (`shadow-sm`)
3. **Floating Layer (4dp)**: Hover state cards (`shadow-lg`)
4. **Modal Layer (16dp)**: Dialogs, chat panels (`shadow-2xl`)
5. **Notification Layer (24dp)**: Floating buttons, tooltips (`shadow-2xl`)

---

## Components

### Buttons

**Variants:** default, destructive, outline, secondary, ghost, link
**Sizes:** sm, default, lg, icon, icon-sm, icon-lg

```tsx
import { Button } from '@/components/ui/button';

// Primary Button (default variant)
<Button variant="default" size="default">
  Get Started
</Button>

// Destructive Button
<Button variant="destructive" size="default">
  Delete Account
</Button>

// Outline Button
<Button variant="outline" size="default">
  Cancel
</Button>

// Ghost Button (minimal)
<Button variant="ghost" size="sm">
  Edit
</Button>

// Icon Button
<Button variant="ghost" size="icon">
  <Pencil className="h-4 w-4" />
</Button>
```

**Size Specifications:**
- `sm`: h-8 (32px), px-3
- `default`: h-9 (36px), px-4
- `lg`: h-10 (40px), px-6
- `icon`: 36x36px square
- `icon-sm`: 32x32px square
- `icon-lg`: 40x40px square

**Focus State:**
```css
focus-visible:border-ring
focus-visible:ring-ring/50
focus-visible:ring-[3px]
```

**Disabled State:**
```css
disabled:pointer-events-none
disabled:opacity-50
```

---

### Inputs

**Types:** text, email, password, number, date

```tsx
import { Input } from '@/components/ui/input';

<Input
  type="text"
  placeholder="Enter amount"
  className="w-full"
/>
```

**Specifications:**
- Height: `h-9` (36px)
- Padding: `px-3 py-1`
- Border: `border border-input`
- Focus ring: `focus-visible:ring-[3px] focus-visible:ring-ring/50`
- Text size: `text-base` on mobile, `md:text-sm` on desktop

**Error State:**
```tsx
<Input
  aria-invalid="true"
  className="aria-invalid:border-destructive aria-invalid:ring-destructive/20"
/>
```

---

### Cards

**Components:** Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Net Worth</CardTitle>
    <CardDescription>Your total assets minus liabilities</CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-3xl font-bold">₹45.2 L</p>
  </CardContent>
</Card>
```

**Specifications:**
- Border: `border` (1px)
- Radius: `rounded-xl` (12px)
- Padding: `py-6` (24px vertical)
- Shadow: `shadow-sm`
- Gap: `gap-6` (24px between sections)

---

### MetricCard (Custom Component)

**Themes:** emerald, violet, orange, blue, amber, slate, indigo, cyan, sky

```tsx
import { MetricCard } from '@/app/dashboard/components/metric-card';
import { Wallet } from 'lucide-react';

<MetricCard
  title="Net Worth"
  value="₹45.2 L"
  subtitle="Total assets minus liabilities"
  icon={<Wallet className="h-6 w-6" />}
  colorTheme="blue"
  trend={{ value: 12.5, label: 'vs last month', isPositive: true }}
  onEdit={() => handleEdit()}
/>
```

**Specifications:**
- Border: `border-2` (themed)
- Radius: `rounded-xl`
- Padding: `p-6`
- Icon size: `h-12 w-12` with `rounded-lg` background
- Hover: `hover:scale-[1.02] hover:shadow-lg`
- Animation: Fade in with `opacity-0 → opacity-1`, `y: 20 → y: 0`

---

### Dialog/Modal

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Edit Income</DialogTitle>
      <DialogDescription>
        Update your monthly income details
      </DialogDescription>
    </DialogHeader>

    {/* Content */}

    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleSave}>
        Save Changes
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Specifications:**
- Max width: `sm:max-w-lg` (32rem / 512px)
- Padding: `p-6`
- Radius: `rounded-lg`
- Backdrop: `bg-black/50`
- Animation: Fade + zoom (scale 95% → 100%)

---

### PillSelector (Custom Component)

```tsx
import { PillSelector } from '@/app/onboarding/components/pill-selector';

<PillSelector
  options={[
    { value: 'single', label: 'Single' },
    { value: 'married', label: 'Married' }
  ]}
  value={maritalStatus}
  onChange={setMaritalStatus}
  columns={2}
  size="md"
/>
```

**Specifications:**
- Columns: 2, 3, or 4 grid
- Sizes:
  - `sm`: h-12, text-sm
  - `md`: h-14, text-base (default)
  - `lg`: h-16, text-lg
- Selected state: Emerald background, white text, shadow
- Unselected state: White/gray background, hover border emerald
- Animation: Scale on hover/tap, check icon on selection

---

### Slider

```tsx
import { Slider } from '@/components/ui/slider';

<Slider
  min={18}
  max={80}
  step={1}
  value={[fireAge]}
  onValueChange={([value]) => setFireAge(value)}
/>
```

**Specifications:**
- Track height: `h-1.5`
- Track color: `bg-primary/20`
- Range color: `bg-primary`
- Thumb size: `h-5 w-5`, `rounded-full`, `border-2 border-primary`

---

### Select

```tsx
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

<Select value={city} onValueChange={setCity}>
  <SelectTrigger>
    <SelectValue placeholder="Select city" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="mumbai">Mumbai</SelectItem>
    <SelectItem value="bangalore">Bangalore</SelectItem>
    <SelectItem value="delhi">Delhi</SelectItem>
  </SelectContent>
</Select>
```

---

### Progress Bar

```tsx
import { Progress } from '@/components/ui/progress';

<Progress value={65} className="h-2" />
```

---

### Toast Notifications

```tsx
import { toast } from 'sonner';

// Success
toast.success('Profile updated successfully');

// Error
toast.error('Failed to save changes');

// Info
toast.info('Your data is being processed');
```

---

### FireStatusBanner (Custom Component)

```tsx
import { FireStatusBanner } from '@/app/dashboard/components/fire-status-banner';

<FireStatusBanner
  isOnTrack={true}
  fireAge={45}
  fireTargetDate="2037-06-15"
  fireLifestyleType="standard"
  yearsToFire={12.5}
  monthlySavingsNeeded={50000}
  currentMonthlySavings={55000}
/>
```

**Specifications:**
- On-track: Emerald gradient background
- Behind: Amber gradient background
- Icon size: `h-14 w-14`
- Radius: `rounded-2xl`
- Border: `border-2`
- Padding: `p-8`

---

## Layout Patterns

### Grid System

**Breakpoints (Tailwind Default):**
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Container Widths

**Max Width Pattern:**
```tsx
<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  {/* Content */}
</div>
```

**Max Width Scale:**
- `max-w-md`: 28rem (448px) - Narrow forms
- `max-w-lg`: 32rem (512px) - **Modals**
- `max-w-xl`: 36rem (576px) - Single column content
- `max-w-2xl`: 42rem (672px) - Articles
- `max-w-7xl`: 80rem (1280px) - **Dashboard container**

### Dashboard Grid Layout

**Metric Cards (2-column on desktop):**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <MetricCard {...} />
  <MetricCard {...} />
</div>
```

**3-Column Layout:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Items */}
</div>
```

### Onboarding Wizard Layout

```tsx
<div className="min-h-screen flex items-center justify-center p-4 md:p-8">
  <Card className="w-full max-w-2xl">
    {/* Wizard content */}
  </Card>
</div>
```

### Chat Panel Layout

```tsx
<div className="fixed bottom-6 right-6 z-50 w-full max-w-md h-[700px]
                bg-white dark:bg-gray-900 rounded-2xl shadow-2xl
                flex flex-col overflow-hidden">
  {/* Header */}
  {/* Messages (flex-1, overflow-auto) */}
  {/* Input (sticky bottom) */}
</div>
```

---

## Interaction Patterns

### Navigation

**Dashboard Navigation:**
- Horizontal nav bar with logo left, user menu right
- Mobile: Hamburger menu (if applicable)
- Active state: Underline or background highlight

**Onboarding Progress:**
- Step indicator at top (1/5, 2/5, etc.)
- Progress bar showing completion percentage
- Back/Next navigation buttons

### Form Validation

**Pattern:**
1. Real-time validation with Zod schemas
2. Error messages below inputs
3. `aria-invalid` attribute on invalid fields
4. Red border + destructive ring on error

**Example:**
```tsx
{errors.email && (
  <p className="text-sm text-destructive mt-1">
    {errors.email.message}
  </p>
)}
```

### Loading States

**Spinner (Loader2 icon):**
```tsx
import { Loader2 } from 'lucide-react';

<Button disabled>
  <Loader2 className="h-4 w-4 animate-spin mr-2" />
  Saving...
</Button>
```

**Skeleton Loaders:**
```tsx
<div className="animate-pulse">
  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-2"></div>
</div>
```

### Error Handling

**Toast Pattern:**
```tsx
try {
  await updateProfile(data);
  toast.success('Profile updated successfully');
} catch (error) {
  toast.error('Failed to update profile');
  console.error(error);
}
```

**Error Boundary Display:**
```tsx
<div className="rounded-lg border border-destructive bg-destructive/10 p-4">
  <p className="text-sm text-destructive">
    An error occurred. Please try again.
  </p>
</div>
```

### Empty States

**Pattern:**
```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <Icon className="h-12 w-12 text-muted-foreground mb-4" />
  <h3 className="text-lg font-semibold mb-2">No data yet</h3>
  <p className="text-sm text-muted-foreground mb-6">
    Get started by adding your first entry
  </p>
  <Button onClick={handleAdd}>
    <Plus className="h-4 w-4 mr-2" />
    Add Entry
  </Button>
</div>
```

### Hover States

**Card Hover:**
```tsx
className="hover:scale-[1.02] hover:shadow-lg transition-all duration-300"
```

**Button Hover:**
```tsx
className="hover:bg-primary/90 transition-colors"
```

**Link Hover:**
```tsx
className="hover:underline underline-offset-4"
```

---

## Animation & Motion

### Framer Motion Patterns

**Fade In + Slide Up (Cards):**
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  {/* Content */}
</motion.div>
```

**Scale Animation (Buttons):**
```tsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
>
  {/* Button */}
</motion.button>
```

**Staggered List Animation:**
```tsx
{options.map((option, index) => (
  <motion.div
    key={option.id}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
  >
    {/* Item */}
  </motion.div>
))}
```

**Panel Slide In (Chat):**
```tsx
<motion.div
  initial={{ opacity: 0, x: 400 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: 400 }}
  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
>
  {/* Panel */}
</motion.div>
```

**Floating Button Entrance:**
```tsx
<motion.button
  initial={{ scale: 0, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  exit={{ scale: 0, opacity: 0 }}
  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
>
  {/* Button */}
</motion.button>
```

### CSS Animations

**Pulse Glow (CTAs):**
```css
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
  }
  50% {
    box-shadow: 0 0 30px rgba(16, 185, 129, 0.6);
  }
}

.pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}
```

**Gradient Animation (Hero Background):**
```css
@keyframes gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.animated-gradient {
  background: linear-gradient(-45deg, #0a0e27, #1e293b, #1e3a5f, #2d1b4e);
  background-size: 400% 400%;
  animation: gradient 15s ease infinite;
}
```

**Float Animation (Decorative Elements):**
```css
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}

.float {
  animation: float 6s ease-in-out infinite;
}
```

**Spinner:**
```tsx
<Loader2 className="animate-spin" />
```

### Reduced Motion Support

**Pattern:**
```tsx
import { useReducedMotion } from 'framer-motion';

const shouldReduceMotion = useReducedMotion();

<motion.div
  animate={{ opacity: 1, y: shouldReduceMotion ? 0 : 20 }}
>
  {/* Content */}
</motion.div>
```

**CSS:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Accessibility Standards

### WCAG 2.1 AA Compliance

**Minimum Requirements:**
- ✅ **Contrast Ratios:**
  - Normal text: 4.5:1 minimum
  - Large text (18pt+/14pt+ bold): 3:1 minimum
  - UI components & graphics: 3:1 minimum
- ✅ **Focus Indicators:** Visible on all interactive elements (3px ring)
- ✅ **Keyboard Navigation:** All features operable via keyboard
- ✅ **Screen Reader Support:** Semantic HTML, ARIA labels where needed
- ✅ **Motion Sensitivity:** Reduced motion support via `prefers-reduced-motion`

### Keyboard Navigation

**Focus Ring Pattern:**
```css
focus-visible:border-ring
focus-visible:ring-ring/50
focus-visible:ring-[3px]
outline-none
```

**Tab Order:** Logical flow from top-left to bottom-right

**Escape Key:** Closes modals and dropdowns

**Enter/Space:** Activates buttons and selects options

### Screen Reader Support

**ARIA Labels:**
```tsx
<button aria-label="Close chat panel">
  <X className="h-4 w-4" />
</button>

<button aria-label="Open AI Chat">
  <Sparkles className="h-6 w-6" />
</button>
```

**ARIA Invalid:**
```tsx
<Input
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? "email-error" : undefined}
/>
{errors.email && (
  <p id="email-error" className="text-sm text-destructive">
    {errors.email.message}
  </p>
)}
```

**Semantic HTML:**
- Use `<button>` for clickable actions (not `<div onClick>`)
- Use `<nav>` for navigation
- Use `<main>`, `<header>`, `<footer>` for page structure
- Use `<h1>` through `<h6>` in logical order

### Color Accessibility

**Never rely on color alone:**
- Use icons + text labels
- Add patterns to charts (not just colors)
- Provide text alternatives for color-coded information

**Example:**
```tsx
// Good: Icon + Color + Text
<div className="flex items-center gap-2 text-emerald-600">
  <CheckCircle2 className="h-4 w-4" />
  <span>On Track</span>
</div>

// Bad: Color only
<div className="text-emerald-600">On Track</div>
```

### Form Accessibility

**Labels:**
```tsx
<Label htmlFor="monthly-income">Monthly Income</Label>
<Input
  id="monthly-income"
  type="number"
  aria-required="true"
/>
```

**Error Messages:**
- Associated with inputs via `aria-describedby`
- Announced to screen readers
- Visible and persistent (not just tooltips)

---

## Icon System

### Library
**Lucide React** - Comprehensive, consistent, open-source icon library

### Icon Sizes

| Class | Size | Usage |
|-------|------|-------|
| `w-3 h-3` | 12px | Inline text icons |
| `w-4 h-4` | 16px | **Small icons (buttons, badges)** |
| `w-5 h-5` | 20px | **Standard icons (inputs, nav)** |
| `w-6 h-6` | 24px | **Medium icons (metric cards, features)** |
| `w-8 h-8` | 32px | Large icons (empty states) |
| `w-12 h-12` | 48px | Extra large icons (hero sections) |

### Icon Categories

**AI Features (Always use Sparkles):**
```tsx
import { Sparkles } from 'lucide-react';

<Sparkles className="w-6 h-6 text-emerald-500" />
```

**Financial Metrics:**
```tsx
import { Wallet, PiggyBank, IndianRupee, TrendingUp, TrendingDown, Target, PieChart } from 'lucide-react';

<Wallet className="w-6 h-6" />        // Net worth
<PiggyBank className="w-6 h-6" />     // Savings
<IndianRupee className="w-6 h-6" />   // Income/currency
<TrendingUp className="w-6 h-6" />    // Growth
<TrendingDown className="w-6 h-6" />  // Decline/expenses
<Target className="w-6 h-6" />        // FIRE goals
<PieChart className="w-6 h-6" />      // Asset allocation
```

**Actions:**
```tsx
import { Pencil, Trash2, Plus, Send, History, MoreVertical, ArrowLeft } from 'lucide-react';

<Pencil className="w-4 h-4" />        // Edit
<Trash2 className="w-4 h-4" />        // Delete
<Plus className="w-4 h-4" />          // Add/New
<Send className="w-4 h-4" />          // Send message
<History className="w-4 h-4" />       // Conversation history
<MoreVertical className="w-4 h-4" />  // Menu
<ArrowLeft className="w-4 h-4" />     // Back navigation
```

**Status:**
```tsx
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

<CheckCircle2 className="w-5 h-5 text-emerald-600" />  // Success/On-track
<AlertTriangle className="w-5 h-5 text-amber-600" />   // Warning
<Loader2 className="w-4 w-4 animate-spin" />           // Loading
```

### Icon Color Patterns

**Themed Icons (in MetricCard):**
```tsx
<div className={theme.iconBg}>
  <Wallet className={theme.accent} />
</div>
```

**Status Icons:**
- Success: `text-emerald-600 dark:text-emerald-400`
- Warning: `text-amber-600 dark:text-amber-400`
- Error: `text-red-600 dark:text-red-400`
- Info: `text-blue-600 dark:text-blue-400`

---

## Currency & Number Formatting

### Indian Number Format

**Lakhs (L) and Crores (Cr) System:**

```typescript
// Short format (for metric cards, charts)
formatFireCurrency(4520000)  // → "₹45.2 L"
formatFireCurrency(12500000) // → "₹1.25 Cr"

// Full format (for detailed views)
new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
}).format(4520000) // → "₹45,20,000"
```

### Formatting Guidelines

**Metric Values:**
- Use short format (₹45.2 L) for dashboard cards
- Use full format (₹45,20,000) for detailed breakdowns
- Always use Indian Rupee symbol (₹) not dollar sign ($)

**Percentages:**
```typescript
// Savings rate
`${savingsRate.toFixed(1)}%` // → "35.5%"

// Trend values
`${trend > 0 ? '+' : ''}${trend}%` // → "+12.5%" or "-5.2%"
```

**Decimal Precision:**
- Currency: 1-2 decimal places for lakhs/crores
- Percentages: 1 decimal place
- Years: 1 decimal place
- Age: Integer only

---

## Best Practices Summary

### Design Principles

1. **Consistency First:** Use existing components and patterns before creating new ones
2. **Accessible by Default:** Every component must meet WCAG 2.1 AA standards
3. **Mobile-First:** Design for mobile, enhance for desktop
4. **Dark Mode Parity:** All features must work equally well in light and dark modes
5. **Performance:** Minimize layout shifts, optimize images, lazy load where appropriate
6. **Indian Context:** Use appropriate terminology, currency formats, and conventions

### Component Usage Rules

1. **Always use themed color palettes** for metric cards (don't use arbitrary colors)
2. **Always include icons** with text labels (never text or icons alone for important actions)
3. **Always provide feedback** for user actions (toast, loading state, success message)
4. **Always support keyboard navigation** and screen readers
5. **Always test in both light and dark mode**

### Naming Conventions

- **Components:** PascalCase (`MetricCard`, `FireStatusBanner`)
- **Files:** kebab-case (`metric-card.tsx`, `fire-status-banner.tsx`)
- **CSS Classes:** Tailwind utilities + custom utilities in `globals.css`
- **Color Variables:** CSS custom properties (`--color-emerald-500`)

---

## Version History

**v1.0** (November 2025)
- Initial design system documentation
- Comprehensive component library
- Accessibility standards
- Indian market context integration

---

## Maintenance & Updates

**To update this document:**
1. Add new components to the Components section
2. Update color palette if new themes are added
3. Document new animation patterns
4. Update accessibility standards as WCAG evolves
5. Keep version history up to date

**Review Schedule:** Quarterly review recommended, update as needed when adding major features.

---

## Related Resources

- **Component Library:** `/components/ui/` (shadcn/ui components)
- **Custom Components:** `/app/dashboard/components/` and `/app/onboarding/components/`
- **Global Styles:** `/app/globals.css`
- **Typography:** Geist Sans & Geist Mono font families
- **Icons:** Lucide React (https://lucide.dev)
- **Animation:** Framer Motion (https://www.framer.com/motion/)
- **Accessibility:** WCAG 2.1 Guidelines (https://www.w3.org/WAI/WCAG21/quickref/)

---

**Document Owner:** Design & Engineering Team
**Last Reviewed:** November 2025
**Next Review:** February 2026
