# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# FireCFO - AI-Powered FIRE Planning App

## Project Overview
FireCFO helps Indians achieve Financial Independence Retire Early (FIRE) through AI-powered financial planning. Target users: 28-40 year olds earning ₹15L-50L annually.

## Tech Stack
- **Framework**: Next.js 16 (App Router, TypeScript, React 19)
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **Database**: Supabase (PostgreSQL + Auth)
- **AI**: Anthropic Claude 3.5 Sonnet API
- **Charts**: Recharts
- **Deployment**: Vercel
- **Email**: Resend (for alerts)
- **Date Utilities**: date-fns

## Development Commands

```bash
# Start development server (Turbopack enabled)
npm run dev
# Opens at http://localhost:3000

# Build for production
npm run build

# Start production server (after build)
npm run start

# Run ESLint
npm run lint
```

**Note**: There are no test scripts configured yet in package.json.

## Key Features (MVP Scope)
1. ✅ User onboarding (5-step wizard) - **COMPLETED**
2. FIRE Dashboard (progress, net worth, asset allocation)
3. AI Financial Advisor Chat
4. Net Worth Tracker (manual + CSV upload)
5. Tax Optimization Calculator (Indian Old Regime)
6. Proactive Alerts (rebalancing, tax deadlines)

## Database Schema

### `user_profiles` Table (IMPLEMENTED)
**Authentication & Metadata:**
- `id` (UUID, FK to auth.users)
- `created_at`, `updated_at` (timestamps with auto-update trigger)
- `onboarding_completed` (boolean)

**Step 1: Personal Information (Date-Based Approach - UPDATED)**
- `date_of_birth` (DATE, NOT NULL) - Source of truth for age calculation
- `city` (text)
- `marital_status` (enum: 'Single', 'Married')
- `dependents` (integer, 0-10)

**Step 2: Income**
- `monthly_income` (integer)
- `spouse_income` (integer, optional)

**Step 3: Expenses**
- `monthly_expenses` (integer)
- `rent_amount` (integer, optional - future use)

**Step 4: Net Worth (Simple Structure for MVP)**
- `equity` (numeric) - Stocks, MFs, index funds
- `debt` (numeric) - FDs, PPF, EPF, bonds
- `cash` (numeric) - Savings, liquid funds
- `real_estate` (numeric) - Property value
- `other_assets` (numeric) - Gold, crypto, etc.
- `current_networth` (numeric) - Auto-calculated sum (legacy field)

**Step 5: FIRE Goal (Date-Based Approach - UPDATED)**
- `fire_target_date` (DATE, NOT NULL) - Computed from date_of_birth + fire_target_age
- `fire_target_age` (integer, 18-80) - User's preferred FIRE age expression
- `fire_lifestyle_type` (enum: 'lean', 'standard', 'fat')

**Calculated FIRE Metrics (Auto-saved from frontend)**
- `lifestyle_inflation_adjustment` (numeric) - LIA percentage (5-20%)
- `safe_withdrawal_rate` (numeric) - Dynamic SWR (3.5, 4.0, or 4.5)
- `post_fire_monthly_expense` (numeric)
- `required_corpus` (numeric)
- `projected_corpus_at_fire` (numeric)
- `monthly_savings_needed` (numeric)
- `is_on_track` (boolean)

### Other Tables (Planned, Not Yet Implemented)
- `assets`: Detailed asset tracking (for post-MVP features like CSV upload, individual asset management)
- `networth_history`: Snapshots over time for tracking progress
- `chat_messages`: AI conversation history
- `alerts`: Notifications and nudges

### Relationships
- One user → One profile
- One user → Many assets (future)
- One user → Many networth snapshots (future)
- One user → Many chat messages (future)
- One user → Many alerts (future)

## Key Business Logic

### FIRE Calculation (IMPLEMENTED)

#### Lifestyle Inflation Adjustment (LIA)
**Formula:** LIA = Base (8%) + Age Factor + Dependents Factor + Savings Rate Factor + Lifestyle Multiplier
**Range:** 5-20% (clamped)

**Age Factor:**
- ≤30 years: +3% (young, expect lifestyle growth)
- 31-35 years: +2%
- 36-40 years: +1%
- 41-45 years: 0%
- 46-50 years: -1%
- >50 years: -2% (established lifestyle)

**Dependents Factor:**
- 0 dependents: 0%
- 1 dependent: +2%
- 2 dependents: +3%
- 3+ dependents: +5%

**Savings Rate Factor:**
- ≥50%: -5% (super saver, already frugal)
- 40-49%: -3%
- 30-39%: -1%
- 20-29%: +1%
- 10-19%: +3%
- <10%: +5% (lifestyle creep expected)

**Lifestyle Multiplier:**
- Lean FIRE: -5% (minimize expenses)
- Standard FIRE: 0% (maintain current lifestyle)
- Fat FIRE: +10% (upgraded lifestyle)

#### Dynamic Safe Withdrawal Rate (SWR)
- **FIRE age <45:** 3.5% SWR (28.6x multiplier) - Conservative for longer withdrawal period (40-50 years)
- **FIRE age 45-55:** 4.0% SWR (25x multiplier) - Standard Trinity Study rate (~30 years)
- **FIRE age >55:** 4.5% SWR (22.2x multiplier) - Optimistic for shorter withdrawal period (20-30 years)

#### Complete Calculation Flow
1. **Post-FIRE Monthly Expense** = Current Monthly Expense × (1 + LIA/100)
2. **Post-FIRE Annual Expense** = Post-FIRE Monthly Expense × 12
3. **Inflation Adjustment** = (1.06)^Years_to_FIRE
4. **Inflation-Adjusted Annual Expense** = Post-FIRE Annual Expense × Inflation Adjustment
5. **Required Corpus** = Inflation-Adjusted Annual Expense × Dynamic SWR Multiplier
6. **Future Value of Current Assets** = Current Net Worth × (1.12)^Years_to_FIRE
7. **Future Value of Monthly Savings** = Monthly Savings × ((1 + monthly_rate)^months - 1) / monthly_rate
8. **Projected Corpus at FIRE** = Future Value of Current Assets + Future Value of Monthly Savings
9. **On Track?** = Projected Corpus ≥ Required Corpus
10. **Monthly Savings Needed** = Reverse calculation if not on track

**Assumptions:**
- Inflation: 6% annually
- Pre-retirement returns: 12% annually (equity-heavy portfolio)
- Post-retirement returns: 8% annually (balanced portfolio)

### Asset Allocation (Planned)
- Equity % = 100 - Age (min 30%, max 70%)
- Debt % = Age (min 20%, max 50%)
- Cash % = Remaining (typically 10-20%)
- Trigger rebalancing alert if deviation >10%

### Tax Calculation (FY 2025-26, Old Regime) (Planned)
- Slabs: 0% up to ₹2.5L, 5% (₹2.5L-5L), 20% (₹5L-10L), 30% (>₹10L)
- Deductions: 80C (₹1.5L max), 80D (₹75K max), 80CCD1B (₹50K), 24(b) (₹2L)
- Add 4% cess on total tax

## 5-Step Onboarding Wizard (IMPLEMENTED)

### Step 1: Personal Information ✅
**Components:** `step-1-personal.tsx`, `ConversationStep`, `PillSelector`, `MicroFeedback`

**Collect:**
- **Age**: Number input (large, centered) + slider (18-65)
- **City**: 6 metro pills (Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Pune) + Dropdown for tier-2 cities + "Other"
- **Marital Status**: Pills (Single / Married)
- **Dependents**: Pills (0, 1, 2, 3+)

**Features:**
- Progressive disclosure: Questions appear sequentially
- Micro-feedback after each selection (personalized messages)
- Auto-scroll to new questions with smart positioning
- Real-time validation with Zod schemas
- Age-based feedback (e.g., "Perfect timing for FIRE at 32")

**Why important:** Age drives asset allocation recommendations, marital status affects dual-income planning and tax optimization

---

### Step 2: Monthly Income ✅
**Components:** `step-2-income.tsx`, `PillSelector`

**Collect:**
- **Your monthly income**: Pills (₹50K, ₹1L, ₹2L, ₹5L, Custom) + custom input
- **Spouse's monthly income** (if married): Pills (None, ₹50K, ₹1L, ₹2L, Custom)

**Show:**
- Total Household Income card (emerald theme)
- Real-time calculation of annual income
- Income-based micro-feedback (e.g., "Excellent position for early FIRE with aggressive wealth building")

**Features:**
- Custom input state properly initialized when returning to step
- Spouse income field only shown if married
- Spouse income resets to 0 if marital status changes to Single
- Income range validation (₹10K-₹50L)
- Dual-income tax planning message for married couples

**Why important:** Core input for savings rate calculation and FIRE timeline projection

---

### Step 3: Monthly Expenses ✅
**Components:** `step-3-expenses.tsx`, `SuggestionCard`

**Collect:**
- **Monthly expenses**: Pills (₹20K, ₹50K, ₹1L, ₹2L, Custom)

**Show:**
- **Suggestion card** (blue/indigo theme): Pre-filled with 60% of household income
- **Savings Rate card** (emerald theme):
  - Large percentage display (text-5xl)
  - Monthly savings amount
  - Annual savings projection
- Dynamic micro-feedback based on savings rate:
  - ≥50%: "Exceptional! Fast track to FIRE"
  - 40-49%: "Excellent! Ahead of 90% of Indians"
  - 30-39%: "Good progress, FIRE in 15-20 years"
  - 20-29%: "Consider optimizing expenses"
  - <20%: "Let's work on increasing savings rate"

**Features:**
- "Use This" button to accept 60% suggestion
- Validation: Expenses cannot exceed household income
- Real-time recalculation of all savings metrics
- Shows both monthly and annual projections

**Why important:** Determines required FIRE corpus and reveals savings capacity

---

### Step 4: Current Net Worth ✅ (All Optional)
**Components:** `step-4-networth.tsx`, `AssetCategorySection`, `ProgressBar`

**Collect (5 asset categories):**
1. **Equity** (TrendingUp icon): None, ₹1L, ₹5L, ₹10L, ₹25L, Custom
   - Tooltip: "Stocks, mutual funds, index funds, and equity investments"
2. **Debt** (Shield icon): None, ₹50K, ₹2L, ₹5L, ₹10L, Custom
   - Tooltip: "Fixed deposits, PPF, EPF, bonds, and debt funds"
3. **Cash** (Wallet icon): None, ₹20K, ₹1L, ₹3L, ₹5L, Custom
   - Tooltip: "Savings accounts, liquid funds, and emergency funds"
4. **Real Estate** (Home icon): None, ₹50L, ₹1Cr, ₹2Cr, Custom
   - Tooltip: "Current market value of properties you own"
5. **Other Assets** (Gem icon): None, ₹50K, ₹2L, ₹5L, ₹10L, Custom
   - Tooltip: "Gold, crypto, vehicles, and other investments"

**Show:**
- Info banner: "All fields optional - skip and add assets later from dashboard"
- Each category with icon header, divider line, pills, and custom input
- **Total Net Worth card** (violet/purple theme):
  - Large total display
  - Asset breakdown with percentages
  - Color-coded animated progress bars (blue, emerald, yellow, orange, purple)
- Asset allocation feedback comparing to ideal allocation based on age

**Features:**
- All fields optional (default to ₹0)
- Can skip entire step
- Visual bars show allocation percentages with smooth animations
- Progressive disclosure: Each category appears after previous is filled

**Why important:** Starting point for FIRE progress tracking and portfolio rebalancing recommendations

---

### Step 5: FIRE Goal ✅
**Components:** `step-5-fire-goal.tsx`, calculation utilities in `fire-calculations.ts`

**Collect:**
- **Target FIRE age**: Slider + large input (current age+1 to 80)
- **FIRE Lifestyle Type**: 3 expandable cards (Lean, Standard, Fat FIRE)
  - Lean FIRE: Minimal expenses, frugal lifestyle
  - Standard FIRE: Current lifestyle maintained
  - Fat FIRE: Upgraded lifestyle with luxuries

**Show:**
- **Years to FIRE card** (blue theme): Countdown + target year (e.g., "15 years, by 2040")
- **FIRE Breakdown card** (orange/amber theme):
  - Post-FIRE monthly expense (with LIA adjustment shown)
  - Required FIRE corpus
  - Current net worth
  - Corpus gap
  - Projected corpus at FIRE age
  - On-track status (green ✓ or amber ⚠️)
  - Monthly savings adjustment needed (if not on track)
- **Expandable calculation details**:
  - Complete breakdown of every calculation step
  - LIA factor-by-factor explanation (base + age + dependents + savings + lifestyle)
  - Dynamic SWR explanation with reasoning
  - Inflation adjustment details
  - Safe withdrawal rate multiplier
- Dynamic micro-feedback based on feasibility:
  - On track: "Excellent! You're on track to achieve Standard FIRE by 45"
  - Surplus: "You might achieve FIRE earlier or consider Fat FIRE"
  - Not on track: "Increase savings by ₹X or extend timeline"
  - Aggressive: "Ambitious! Requires high savings rate and discipline"

**Features:**
- **NO user input for post-FIRE expenses** - calculated automatically via LIA
- Real-time recalculation as FIRE age slider moves
- Dynamic SWR automatically adjusts (3.5%, 4%, or 4.5%)
- All calculated metrics saved to database for historical tracking
- Expandable "How we calculated this" section with full transparency
- Validates FIRE age must be greater than current age

**Why important:** The core goal that drives everything, with realistic, personalized calculations

---

## Dashboard Implementation (COMPLETED)

### Overview
The dashboard provides a comprehensive view of the user's FIRE progress, displaying key metrics, visualizations, and goal tracking. Currently implemented as a **read-only display** pulling data from the onboarding flow.

### Components & Features

#### 1. Dashboard Page (`app/dashboard/page.tsx`)
- Client-side authentication verification
- Checks `onboarding_completed` status
- Redirects unauthorized users to `/login` or `/onboarding`
- Displays user name and email
- Logout functionality
- Renders `DashboardOverview` component

#### 2. Data Layer (`app/dashboard/hooks/use-dashboard-data.ts`)
Custom React hook that:
- Fetches complete user profile from Supabase `user_profiles` table
- Transforms database row into `DashboardData` type
- Calculates derived values:
  - Years to FIRE (fireAge - age)
  - Monthly savings (income + spouseIncome - expenses)
  - Savings rate percentage
  - Current net worth (sum of all 5 asset categories)
- Provides loading/error states and `refetch()` function
- Auto-fetches on component mount

#### 3. FIRE Status Banner (`fire-status-banner.tsx`)
Large prominent banner at top of dashboard:
- **On Track Status** (emerald theme): Shows when `projected_corpus_at_fire >= required_corpus`
- **Needs Adjustment** (amber theme): Shows when user won't reach goal
- Displays:
  - FIRE lifestyle type badge (Lean/Standard/Fat)
  - Years countdown to FIRE age
  - Target year calculation
  - Savings gap amount if not on track
- Animated with Framer Motion fade-in

#### 4. Metric Cards (`metric-card.tsx`)
Reusable card component with 5 color themes. Dashboard displays 6 cards:
1. **Current Net Worth** (violet): Sum of all assets
2. **Required FIRE Corpus** (orange): Inflation-adjusted target
3. **Projected Corpus at FIRE** (emerald): Future value with 12% returns
4. **Monthly Household Income** (emerald): User + spouse income
5. **Monthly Expenses** (blue): Current spending
6. **Savings Rate** (emerald): Percentage of income saved

Features:
- Icon with colored circular background
- Large value display with Indian formatting
- Subtitle for context
- Optional trend indicators (ArrowUp/Down)
- Hover scale animation
- Dark mode support

#### 5. Net Worth Growth Chart (`networth-chart.tsx`)
Recharts AreaChart showing wealth projection:
- **X-axis**: Age milestones from current age to FIRE age
- **Y-axis**: Net worth in lakhs/crores (Indian formatting)
- **Two data series**:
  - **Projected Corpus** (emerald filled area with gradient): Future value calculation assuming 12% returns
  - **Required Corpus** (violet dashed line): Goal target adjusted for inflation
- Custom tooltip with formatted currency
- Legend explaining both lines
- Blue theme card wrapper
- Generated by `generateNetWorthChartData()` utility

**Calculation Logic:**
- Creates data points every 2-5 years based on timeline length
- Future value of current assets: `currentNetWorth × (1.12)^yearsFromNow`
- Future value of monthly savings: Annuity formula with 12% annual return
- Total projected = assets + savings

#### 6. Asset Allocation Pie Chart (`asset-allocation-chart.tsx`)
Recharts PieChart (donut style) showing portfolio breakdown:
- **5 asset categories** with custom colors:
  - Equity (blue): Stocks, mutual funds, index funds
  - Debt (emerald): FDs, PPF, EPF, bonds
  - Cash (yellow): Savings accounts, liquid funds
  - Real Estate (orange): Property values
  - Other (purple): Gold, crypto, vehicles
- Features:
  - Custom labels showing percentages (hidden if <5%)
  - Custom tooltip with amount and percentage
  - Legend with category names and percentages
  - **Recommended Allocation Display**: Shows ideal allocation based on age (Equity = 100 - Age, Debt = Age)
  - **Rebalancing Alert**: Warning if deviation from recommended >10%
  - Empty state message if no assets entered
- Violet theme card wrapper
- Generated by `generateAssetAllocationData()` utility

#### 7. FIRE Calculation Details Section
Displays the math behind the projections:
- **Post-FIRE Monthly Expense**: Current expenses adjusted by LIA
- **Safe Withdrawal Rate**: Dynamic SWR (3.5%, 4%, or 4.5% based on FIRE age)
- **Monthly Savings Needed**: Gap analysis if not on track
- Shows lifestyle inflation adjustment percentage
- Explains SWR reasoning (early vs late retirement)
- Amber theme section

#### 8. Dashboard Calculations (`utils/dashboard-calculations.ts`)
Utility functions for data transformation:

**`generateNetWorthChartData()`**: Creates projection array
- Input: currentAge, fireAge, currentNetWorth, monthlySavings
- Uses 12% pre-retirement return assumption
- Generates intermediate points (every 2-5 years)
- Returns array of `{age, projectedCorpus, requiredCorpus}`

**`generateAssetAllocationData()`**: Prepares pie chart data
- Filters zero-value assets
- Calculates percentages
- Assigns colors and names
- Returns array of `{name, value, percentage, color}`

**`getRecommendedAllocation()`**: Age-based allocation
- Equity: `100 - age` (clamped 30-70%)
- Debt: `age` (clamped 20-50%)
- Cash: Remaining balance
- Returns `{equity, debt, cash}` percentages

**`calculateSavingsGap()`**: Monthly shortfall
- If not on track, calculates additional savings needed
- Returns difference between required and current savings

**`formatIndianCurrency()`**: Lakhs/crores formatting
- ≥1 crore: "₹X.XX Cr"
- ≥1 lakh: "₹X.XX L"
- <1 lakh: "₹X,XXX"

**`formatFullIndianCurrency()`**: Full INR format
- Uses `Intl.NumberFormat('en-IN', {style: 'currency', currency: 'INR'})`

#### 9. Type Definitions (`types.ts`)
Complete TypeScript interfaces:
- `DashboardData`: All user profile fields + derived values
- `NetWorthChartDataPoint`: `{age, projectedCorpus, requiredCorpus}`
- `AssetAllocation`: `{name, value, percentage, color}`
- `MetricCardProps`: Props for metric card component
- `FireStatusBannerProps`: Props for status banner

### Data Flow
```
User loads /dashboard
  ↓
Dashboard page checks auth & onboarding status
  ↓
DashboardOverview component mounts
  ↓
useDashboardData hook fetches from Supabase
  ↓
Transform data + calculate derived values
  ↓
Pass to child components:
  - FireStatusBanner
  - MetricCards (×6)
  - NetWorthChart
  - AssetAllocationChart
  - FIRE Details Section
  ↓
Each component renders with Framer Motion animations
```

### Key Assumptions Used
- **Pre-retirement returns**: 12% annually (equity-heavy portfolio)
- **Inflation**: 6% annually (from onboarding calculations)
- **Post-retirement returns**: 8% annually (not yet used in dashboard)
- All calculated metrics are **stored in database** from onboarding, not recalculated

### Current Limitations
1. **Read-only**: Cannot edit any values from dashboard
2. **No historical data**: Only shows future projections, no past tracking
3. **Aggregate assets only**: Individual assets not tracked
4. **No refresh mechanism**: Must reload page to see updated data
5. **No goal adjustment**: Must return to onboarding to change FIRE age/lifestyle
6. **Static assumptions**: Cannot customize return rates or inflation

---

## Technical Implementation

### Reusable Components Created
1. **`ConversationStep`** (`conversation-step.tsx`): Question wrapper with icon badge, tooltip, children, validation errors
2. **`PillSelector`** (`pill-selector.tsx`): Button-based selection UI (2-4 columns, sm/md/lg sizes)
3. **`MicroFeedback`** (`micro-feedback.tsx`): Contextual feedback messages (success/info/tip variants)
4. **`SuggestionCard`** (`suggestion-card.tsx`): Pre-filled value suggestion with "Use This" button
5. **`AssetCategorySection`** (`asset-category-section.tsx`): Category header with icon + divider + pills + custom input
6. **`ProgressBar`** (`progress-bar.tsx`): Animated horizontal allocation bars with labels and percentages

### Auto-Save System
- Debounced save (1 second delay) via `use-auto-save.ts` hook
- Saves all form fields + calculated FIRE metrics automatically
- Shows "Saved ✓" indicator in green
- Handles errors gracefully ("Failed to save. Changes stored locally")
- Resume functionality: "Welcome back!" banner when returning to incomplete onboarding
- Prevents duplicate saves via data comparison

### Validation
- Zod schemas for each step (`step1Schema`, `step2Schema`, etc.)
- Strict validation triggered on "Next" button click
- Real-time inline errors displayed below questions
- Can't proceed with invalid data (Next button disabled)
- Custom validation for FIRE age > current age
- Expense validation: cannot exceed household income

### UX Features
- **Progress indicator**: Icons for each step (User, DollarSign, TrendingDown, Wallet, Target)
- **Navigation**: Back/Next buttons with appropriate disabled states
- **Auto-scroll**: Smart scrolling based on navigation direction (top on back, bottom on forward)
- **Responsive**: Mobile-first design, adapts grid layouts for small screens
- **Dark mode**: Full support across all components with dark: variants
- **Animations**: Framer Motion for smooth transitions (fade, scale, slide)
- **Accessibility**: Focus rings, proper ARIA labels, keyboard navigation, reduced motion support

### Color Themes per Step
- **Step 1 (Personal)**: Emerald - personal connection
- **Step 2 (Income)**: Emerald - financial foundation
- **Step 3 (Expenses)**: Emerald - savings focus
- **Step 4 (Net Worth)**: Violet/Purple - wealth accumulation
- **Step 5 (FIRE Goal)**: Orange/Amber - goal setting and achievement

### Smart Scroll Behavior
- Respects `prefers-reduced-motion` accessibility setting
- Optimal scroll positioning based on viewport height
- 800ms delay to allow Framer Motion animations to complete
- Different behavior for back/forward/initial navigation
- Skips scroll if element already in viewport or keyboard is open

---

## File Structure
```
app/
├── onboarding/
│   ├── components/
│   │   ├── step-1-personal.tsx           # Step 1 component
│   │   ├── step-2-income.tsx             # Step 2 component
│   │   ├── step-3-expenses.tsx           # Step 3 component
│   │   ├── step-4-networth.tsx           # Step 4 component
│   │   ├── step-5-fire-goal.tsx          # Step 5 component
│   │   ├── onboarding-wizard.tsx         # Main orchestrator with form state
│   │   ├── progress-indicator.tsx        # Step progress UI
│   │   ├── conversation-step.tsx         # Reusable question wrapper
│   │   ├── pill-selector.tsx             # Reusable button selector
│   │   ├── micro-feedback.tsx            # Reusable feedback messages
│   │   ├── suggestion-card.tsx           # Reusable suggestion UI
│   │   ├── asset-category-section.tsx    # Reusable asset category
│   │   └── progress-bar.tsx              # Reusable allocation bars
│   ├── hooks/
│   │   └── use-auto-save.ts              # Auto-save hook with debouncing
│   ├── utils/
│   │   ├── scroll-helpers.ts             # Smart scroll utilities
│   │   └── fire-calculations.ts          # LIA, SWR, FIRE metrics calculations
│   ├── types.ts                          # Zod schemas + TypeScript types
│   └── page.tsx                          # Onboarding route entry point
│
├── dashboard/
│   ├── components/
│   │   ├── dashboard-overview.tsx        # Main dashboard orchestrator
│   │   ├── fire-status-banner.tsx        # On-track status banner (emerald/amber)
│   │   ├── metric-card.tsx               # Reusable metric display with 5 themes
│   │   ├── networth-chart.tsx            # Wealth projection chart (Recharts)
│   │   ├── asset-allocation-chart.tsx    # Pie chart for asset breakdown
│   │   ├── edit-income-expenses-modal.tsx # Quick edit modal for income/expenses
│   │   └── edit-assets-modal.tsx         # Quick edit modal for assets
│   ├── settings/
│   │   ├── components/
│   │   │   ├── settings-section.tsx      # Section wrapper
│   │   │   ├── edit-personal-info-modal.tsx # Personal info editor
│   │   │   ├── edit-fire-goal-modal.tsx  # FIRE goal editor
│   │   │   └── impact-preview.tsx        # Change preview component
│   │   └── page.tsx                      # Settings page (NEW)
│   ├── hooks/
│   │   └── use-dashboard-data.ts         # Data fetching hook from Supabase
│   ├── utils/
│   │   └── dashboard-calculations.ts     # Chart generators, formatters
│   ├── types.ts                          # Dashboard TypeScript types
│   └── page.tsx                          # Dashboard route (protected)
│
├── utils/
│   └── date-helpers.ts                   # Date/age calculation utilities (NEW)
│
├── auth/
│   └── callback/
│       └── route.ts                      # Supabase OAuth callback handler
├── login/
│   └── page.tsx                          # Login page
├── signup/
│   └── page.tsx                          # Signup page
├── page.tsx                              # Landing page
├── layout.tsx                            # Root layout
└── globals.css                           # Global styles
```

### Database Migrations
```
supabase-migration.sql                    # Base user_profiles table + triggers
add-step4-asset-fields.sql                # Asset category columns
add-step5-fire-goal-fields.sql            # FIRE goal + calculated metrics columns
fix-rls-policies.sql                      # Row Level Security policies
migrate-to-date-based-age.sql             # NEW: Date-based age system (replaces age/fire_age)
```

---

## Application Architecture

### Authentication & Routing Flow
**Middleware (`middleware.ts`):**
- Runs on all routes (except static assets, images, API routes)
- Checks authentication via `supabase.auth.getUser()`
- Protected routes: `/dashboard`, `/onboarding`
- Redirects authenticated users from `/login`, `/signup` to dashboard or onboarding based on `onboarding_completed` flag
- Uses Supabase SSR with cookie management for session handling

**Route Structure:**
```
/                    → Landing page (public)
/login, /signup      → Auth pages (redirects if authenticated)
/onboarding          → 5-step wizard (requires auth, redirects if completed)
/dashboard           → Main app (requires auth + onboarding completed)
/auth/callback       → Supabase OAuth callback handler
```

### Supabase Client Patterns
**Browser Client (`lib/supabase.ts`):**
- Singleton pattern using `createBrowserClient` from `@supabase/ssr`
- Used in client components for queries, mutations, auth state
- Import: `import { supabase } from '@/lib/supabase'`

**Server Client (Middleware):**
- Created per-request with `createServerClient` from `@supabase/ssr`
- Handles cookie-based session management for SSR
- Critical for auth checks in middleware

**Important**: Always use the browser client singleton in client components. Never create multiple instances.

### Auto-Save Pattern
The onboarding wizard uses a debounced auto-save system:
- Hook: `app/onboarding/hooks/use-auto-save.ts`
- 500ms debounce delay (configurable)
- Filters out undefined/null/empty string values before upsert
- Preserves 0 values (valid for `spouse_income`, `dependents`)
- Never overwrites `onboarding_completed` via auto-save
- Uses `dataRef` pattern to avoid stale closures
- Provides `saveNow()` for manual immediate saves

### FIRE Calculation System
All FIRE calculations are in `app/onboarding/utils/fire-calculations.ts`:
- **LIA calculation**: Multi-factor algorithm (age, dependents, savings rate, lifestyle)
- **Dynamic SWR**: Changes based on FIRE age (3.5%, 4%, 4.5%)
- **Future value calculations**: Compound interest for assets and monthly savings
- **Currency formatting**: Indian format helper (`formatFireCurrency`)
- These calculations are performed client-side and saved to database

## Coding Conventions
- **File naming**: kebab-case (user-profile.tsx)
- **Component naming**: PascalCase (UserProfile)
- **API routes**: RESTful (`GET /api/assets`, `POST /api/chat/message`)
- **Error handling**: Always wrap API calls in try-catch, return proper status codes
- **Types**: Define TypeScript interfaces for all data models, use Zod for validation
- **Styling**: Tailwind + shadcn/ui only (no custom CSS files)
- **Currency formatting**: Indian number format with lakhs/crores using `formatFireCurrency` or `Intl.NumberFormat('en-IN')`

---

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
```

---

## Current Development Phase
**✅ COMPLETED:** Week 1-2 - Foundation (Auth + Onboarding)
- Full 5-step onboarding wizard implemented
- Auto-save functionality with Supabase
- Smart FIRE calculations with dynamic SWR
- All reusable UI components built
- Database schema with calculated metrics
- Row Level Security policies configured

**✅ COMPLETED:** Week 3 - FIRE Dashboard (Read-Only)
- Dashboard page with authentication guards
- FIRE Status Banner (on-track indicator)
- 6 Metric Cards (net worth, corpus, income, expenses, savings rate)
- Net Worth Growth Chart (future projection with Recharts)
- Asset Allocation Pie Chart (5 categories with rebalancing alerts)
- Data fetching hook (`use-dashboard-data.ts`)
- Dashboard calculation utilities
- Responsive grid layout with dark mode

**✅ COMPLETED:** Week 4 - Interactive Data Management & Settings
- Quick edit modals for income/expenses/assets
- Settings page for personal info and FIRE goal editing
- Impact preview showing calculation changes
- Date-based age calculation system with date-fns
- Dedicated settings route at `/dashboard/settings`

**📋 TODO:** Week 5+ - Advanced Features
- Historical net worth chart (actual values over time)
- CSV upload for bulk asset import
- Goal adjustment interface (change FIRE age/lifestyle)
- What-if calculator
- Progress indicators and milestones
- Export reports (PDF/CSV)

---

## Debugging & Common Issues

### Onboarding Data Not Saving
- Check browser console for auto-save debug logs (prefixed with `🔍 DEBUG`)
- Verify Supabase RLS policies are correctly configured (`fix-rls-policies.sql`)
- Ensure `onboarding_completed` is not being set prematurely
- Check that cleaned data isn't empty (all fields undefined/null)

### Authentication Redirect Loops
- Clear browser cookies and localStorage
- Verify middleware is running (check Network tab for redirects)
- Ensure `user_profiles.onboarding_completed` matches actual state
- Check `middleware.ts` matcher pattern isn't excluding routes

### Database Migrations
Apply migrations in order:
1. `supabase-migration.sql` - Base schema
2. `add-step4-asset-fields.sql` - Asset columns
3. `add-step5-fire-goal-fields.sql` - FIRE goal columns
4. `fix-rls-policies.sql` - RLS policies

### FIRE Calculation Issues
- All assumptions are hardcoded in `fire-calculations.ts`:
  - Inflation: 6% annually
  - Pre-retirement returns: 12% annually
  - Post-retirement returns: 8% annually (not currently used in corpus calculation)
- LIA is clamped to 5-20% range
- SWR changes at age thresholds: <45, 45-55, >55

---

## Date-Based Age Architecture (IMPORTANT)

### Migration from Static Age to Date-Based System
The application recently migrated from storing `age` as an integer to a date-based system using `date_of_birth`. This is a critical architectural decision.

**Old Approach (Deprecated):**
```typescript
age: 32  // Static value, becomes stale
fire_age: 45  // Static target
```

**New Approach (Current):**
```typescript
date_of_birth: '1993-06-15'  // Source of truth
fire_target_date: '2038-06-15'  // Computed target
fire_target_age: 45  // User's preferred expression
```

### Benefits of Date-Based System
1. **Automatic age updates**: Age calculated dynamically from DOB
2. **Precise countdowns**: FIRE countdown to exact date (years, months, days)
3. **Birthday awareness**: Calculations account for actual birth date
4. **Historical accuracy**: Past snapshots maintain correct ages
5. **Future-proof**: No need to manually update ages

### Implementation Guidelines
1. **Always calculate age, never store it**:
   ```typescript
   import { calculateAge } from '@/app/utils/date-helpers';
   const age = calculateAge(dateOfBirth);
   ```

2. **Use date-fns for all date operations**:
   ```typescript
   import { calculateFireCountdown, formatFireTargetDate } from '@/app/utils/date-helpers';
   ```

3. **Store dates as DATE type in PostgreSQL**:
   ```sql
   date_of_birth DATE NOT NULL
   fire_target_date DATE NOT NULL
   ```

4. **Compute FIRE target date from age preference**:
   ```typescript
   import { calculateFireTargetDate } from '@/app/utils/date-helpers';
   const fireDate = calculateFireTargetDate(dateOfBirth, targetAge);
   ```

### Available Date Helpers
All in `app/utils/date-helpers.ts`:
- `calculateAge(dateOfBirth)` - Current age in years
- `calculateFireTargetDate(dateOfBirth, targetAge)` - Compute FIRE date
- `calculateYearsToFire(fireTargetDate)` - Years remaining
- `calculateFireCountdown(fireTargetDate)` - Detailed breakdown (years/months/days)
- `formatFireTargetDate(date)` - Display format (e.g., "June 2037")
- `getBirthYear(dateOfBirth)` / `getBirthMonth(dateOfBirth)` - Extract components
- `isAgeInRange(dateOfBirth, min, max)` - Validation
- `isFireDateValid(dateOfBirth, fireTargetDate)` - Validation

---

## Notes for AI
- Always use Indian financial terminology (₹, lakhs, crores)
- Use `formatFireCurrency` from `fire-calculations.ts` or `Intl.NumberFormat('en-IN')` for currency formatting
- **CRITICAL**: Age is calculated from `date_of_birth`, never stored statically. Always use date helpers.
- Use date-fns for all date operations via `app/utils/date-helpers.ts`
- Prioritize simplicity over perfection (this is MVP)
- When unsure, ask before implementing complex solutions
- Test calculations manually before shipping
- All calculated metrics should be saved to database for historical tracking
- Use Framer Motion for all animations
- Follow established color themes per feature area
- Maintain dark mode support across all new components
- Client components must use `'use client'` directive at the top
- Never create multiple Supabase client instances - always use the singleton from `lib/supabase.ts`
