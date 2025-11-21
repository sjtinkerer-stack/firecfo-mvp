# FireCFO Design System - Quick Reference Cheat Sheet

**For Developers** - Keep this open while coding for instant reference

---

## Colors - Common Patterns

```tsx
// Metric Card Themes
'emerald'  // Primary, AI, On-track
'violet'   // Savings
'orange'   // Income
'blue'     // Net worth, Corpus
'amber'    // Warning, Behind target
'slate'    // Neutral

// Status Colors
'text-emerald-600 dark:text-emerald-400'  // Success
'text-amber-600 dark:text-amber-400'      // Warning
'text-red-600 dark:text-red-400'          // Error
'text-blue-600 dark:text-blue-400'        // Info

// Gradients
'bg-gradient-to-r from-emerald-500 to-emerald-600'  // Emerald button
'bg-gradient-to-r from-emerald-400 to-purple-500'   // Text gradient
```

---

## Typography - Quick Scale

```tsx
text-xs    // 12px - Metadata, timestamps
text-sm    // 14px - Secondary text, labels
text-base  // 16px - Body text
text-lg    // 18px - Card subtitles
text-2xl   // 24px - Section headers
text-3xl   // 30px - METRIC VALUES ⭐
```

**Weights:**
- `font-medium` (500) - Labels
- `font-semibold` (600) - Subheadings
- `font-bold` (700) - Headlines, metric values

---

## Spacing - Common Values

```tsx
gap-3   // 12px - Pill selectors
gap-4   // 16px - Inline elements
gap-6   // 24px - Card sections ⭐ STANDARD
gap-8   // 32px - Large sections

p-6     // 24px - Standard card padding ⭐
p-8     // 32px - Banner padding
```

---

## Border Radius

```tsx
rounded-md   // 6px - Buttons, inputs
rounded-xl   // 12px - Cards ⭐ STANDARD
rounded-2xl  // 16px - Banners
rounded-full // Pills, avatars
```

---

## Components - Copy/Paste

### Button
```tsx
import { Button } from '@/components/ui/button';

<Button variant="default">Primary</Button>
<Button variant="outline">Secondary</Button>
<Button variant="ghost" size="sm">
  <Pencil className="h-4 w-4 mr-2" />
  Edit
</Button>
<Button variant="destructive">Delete</Button>
```

### Input
```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

<Label htmlFor="amount">Amount</Label>
<Input
  id="amount"
  type="number"
  placeholder="₹0"
  aria-invalid={!!error}
/>
{error && <p className="text-sm text-destructive mt-1">{error}</p>}
```

### Card
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Net Worth</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-3xl font-bold">₹45.2 L</p>
  </CardContent>
</Card>
```

### MetricCard
```tsx
import { MetricCard } from '@/app/dashboard/components/metric-card';
import { Wallet } from 'lucide-react';

<MetricCard
  title="Net Worth"
  value="₹45.2 L"
  subtitle="Total assets"
  icon={<Wallet className="h-6 w-6" />}
  colorTheme="blue"
  onEdit={() => {}}
/>
```

### Dialog
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const [open, setOpen] = useState(false);

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Edit Data</DialogTitle>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      <Button onClick={handleSave}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### PillSelector
```tsx
import { PillSelector } from '@/app/onboarding/components/pill-selector';

<PillSelector
  options={[
    { value: 'single', label: 'Single' },
    { value: 'married', label: 'Married' }
  ]}
  value={value}
  onChange={setValue}
  columns={2}
  size="md"
/>
```

### Slider
```tsx
import { Slider } from '@/components/ui/slider';

<Slider
  min={18}
  max={80}
  step={1}
  value={[age]}
  onValueChange={([val]) => setAge(val)}
/>
```

### Toast
```tsx
import { toast } from 'sonner';

toast.success('Saved successfully');
toast.error('Failed to save');
toast.info('Processing...');
```

---

## Icons - Common Usage

```tsx
import {
  // AI
  Sparkles,           // ⭐ AI Chat (ALWAYS use this for AI)

  // Financial
  Wallet,             // Net worth
  PiggyBank,          // Savings
  IndianRupee,        // Income/Currency
  TrendingUp,         // Growth
  TrendingDown,       // Decline/Expenses
  Target,             // FIRE goals
  PieChart,           // Asset allocation

  // Actions
  Pencil,             // Edit
  Trash2,             // Delete
  Plus,               // Add
  Send,               // Send message
  X,                  // Close

  // Status
  CheckCircle2,       // Success
  AlertTriangle,      // Warning
  Loader2,            // Loading (with animate-spin)
} from 'lucide-react';

// Standard sizes
className="h-4 w-4"  // Small (buttons)
className="h-5 w-5"  // Standard (nav)
className="h-6 w-6"  // Medium (cards) ⭐
className="h-8 w-8"  // Large
```

---

## Animations

### Framer Motion
```tsx
import { motion } from 'framer-motion';

// Fade in + Slide up (cards)
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>

// Scale on hover/tap
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
>

// Stagger children
{items.map((item, i) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: i * 0.05 }}
  >
))}
```

### CSS
```tsx
// Hover scale (cards)
className="hover:scale-[1.02] hover:shadow-lg transition-all duration-300"

// Spinner
<Loader2 className="h-4 w-4 animate-spin" />

// Pulse (notification dot)
className="animate-pulse"
```

---

## Layouts

### Dashboard Container
```tsx
<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  {/* Content */}
</div>
```

### 2-Column Grid (Metric Cards)
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <MetricCard {...} />
  <MetricCard {...} />
</div>
```

### 3-Column Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Items */}
</div>
```

### Centered Form
```tsx
<div className="min-h-screen flex items-center justify-center p-4">
  <Card className="w-full max-w-2xl">
    {/* Form */}
  </Card>
</div>
```

---

## Accessibility Checklist

```tsx
// ✅ Focus ring on all interactive elements
className="focus-visible:ring-[3px] focus-visible:ring-ring/50"

// ✅ ARIA labels on icon-only buttons
<button aria-label="Close dialog">
  <X className="h-4 w-4" />
</button>

// ✅ Error states
<Input
  aria-invalid={!!error}
  aria-describedby={error ? "error-msg" : undefined}
/>
{error && <p id="error-msg" className="text-destructive">{error}</p>}

// ✅ Loading states
<Button disabled>
  <Loader2 className="h-4 w-4 animate-spin mr-2" />
  Saving...
</Button>

// ✅ Form labels
<Label htmlFor="input-id">Label Text</Label>
<Input id="input-id" />
```

---

## Currency Formatting

```tsx
import { formatFireCurrency } from '@/app/onboarding/utils/fire-calculations';
import { formatIndianCurrency } from '@/app/dashboard/utils/dashboard-calculations';

// Short format (metric cards)
formatFireCurrency(4520000)  // → "₹45.2 L"
formatFireCurrency(12500000) // → "₹1.25 Cr"

// Full format (detailed views)
new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
}).format(4520000) // → "₹45,20,000"
```

---

## Common Patterns

### Loading State
```tsx
const [loading, setLoading] = useState(false);

<Button disabled={loading}>
  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
  {loading ? 'Saving...' : 'Save'}
</Button>
```

### Error Display
```tsx
{error && (
  <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
    <p className="text-sm text-destructive">{error}</p>
  </div>
)}
```

### Empty State
```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <Icon className="h-12 w-12 text-muted-foreground mb-4" />
  <h3 className="text-lg font-semibold mb-2">No data yet</h3>
  <p className="text-sm text-muted-foreground mb-6">Get started by adding your first entry</p>
  <Button>
    <Plus className="h-4 w-4 mr-2" />
    Add Entry
  </Button>
</div>
```

### Hover Card
```tsx
className="rounded-xl border-2 p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
```

### Status Badge
```tsx
<span className="rounded-full px-3 py-1 text-xs font-semibold bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200">
  On Track
</span>
```

---

## Breakpoints

```tsx
sm:   // 640px  - Tablet
md:   // 768px  - Tablet landscape
lg:   // 1024px - Desktop
xl:   // 1280px - Large desktop
2xl:  // 1536px - Extra large
```

**Example:**
```tsx
className="text-sm md:text-base lg:text-lg"
className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
className="px-4 sm:px-6 lg:px-8"
```

---

## Dark Mode Pattern

```tsx
// Background + Text
className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"

// Borders
className="border-gray-200 dark:border-gray-800"

// Themed colors (use theme objects)
className="bg-emerald-50 dark:bg-emerald-950"
className="text-emerald-900 dark:text-emerald-100"
```

---

## Import Shortcuts

```tsx
// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

// Custom Components
import { MetricCard } from '@/app/dashboard/components/metric-card';
import { PillSelector } from '@/app/onboarding/components/pill-selector';
import { FireStatusBanner } from '@/app/dashboard/components/fire-status-banner';

// Icons
import { Sparkles, Wallet, Pencil, X, Loader2 } from 'lucide-react';

// Utils
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Animations
import { motion } from 'framer-motion';
```

---

## Common Mistakes to Avoid

❌ **Don't:** Use arbitrary colors
```tsx
className="bg-green-500"  // ❌ Inconsistent
```
✅ **Do:** Use themed palettes
```tsx
colorTheme="emerald"  // ✅ Consistent
```

❌ **Don't:** Icon-only buttons without labels
```tsx
<button><Pencil /></button>  // ❌ Not accessible
```
✅ **Do:** Add ARIA labels
```tsx
<button aria-label="Edit profile"><Pencil /></button>  // ✅
```

❌ **Don't:** Use `<div onClick>`
```tsx
<div onClick={handleClick}>Click me</div>  // ❌
```
✅ **Do:** Use semantic HTML
```tsx
<button onClick={handleClick}>Click me</button>  // ✅
```

❌ **Don't:** Forget dark mode
```tsx
className="bg-white text-black"  // ❌ Broken in dark mode
```
✅ **Do:** Support both modes
```tsx
className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"  // ✅
```

---

**💡 Pro Tip:** Keep this cheat sheet in a side-by-side editor while coding!

**📖 Full Reference:** See `FireCFO Design System Reference.md` for complete documentation
