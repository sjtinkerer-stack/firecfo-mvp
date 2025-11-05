# Onboarding Wizard

A 5-step onboarding wizard for FireCFO users to set up their FIRE plan.

## Features Implemented (Steps 1 & 2)

### Step 1: Personal Information
- Age selection (dropdown, 18-65)
- City selection (grouped by region: North, South, West, East India)
- Marital Status (radio buttons: Single / Married)
- Number of dependents (0-10)

### Step 2: Monthly Income
- Your monthly in-hand income (₹10,000 - ₹50,00,000)
- Spouse's monthly income (optional, auto-disabled if Single)
- Real-time total household income calculation with animation
- Income range indicator (Below Average, Average, Above Average, High Earner)
- Annual income display

## UX Features
- **Progressive Disclosure**: Fields reveal with animations
- **Progress Indicator**:
  - Mobile: Simple "Step X of 5" with progress bar
  - Desktop: Icon-based stepper with labels
  - Time remaining estimate
- **Auto-save**: Debounced saves to Supabase (1 second delay)
- **Visual Feedback**: "Saving..." and "Changes saved" indicators
- **Inline Validation**: Real-time form validation with helpful error messages
- **URL-based Routing**: `/onboarding?step=1` for bookmarkable progress
- **Responsive Design**: Mobile-first with touch-friendly inputs
- **Contextual Help**: Info cards explaining why data is needed

## Database Schema Required

Create the `user_profiles` table in Supabase:

```sql
-- Create user_profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Step 1: Personal Information
  age INTEGER CHECK (age >= 18 AND age <= 65),
  city TEXT,
  marital_status TEXT CHECK (marital_status IN ('Single', 'Married')),
  dependents INTEGER DEFAULT 0 CHECK (dependents >= 0 AND dependents <= 10),

  -- Step 2: Monthly Income
  monthly_income INTEGER CHECK (monthly_income >= 10000 AND monthly_income <= 5000000),
  spouse_income INTEGER DEFAULT 0 CHECK (spouse_income >= 0 AND spouse_income <= 5000000),

  -- Step 3: Monthly Expenses (TODO)
  monthly_expenses INTEGER,
  rent_amount INTEGER,

  -- Step 4: Net Worth (TODO)
  current_networth NUMERIC(15, 2),

  -- Step 5: FIRE Goal (TODO)
  fire_age INTEGER,
  fire_target_amount NUMERIC(15, 2),

  -- Metadata
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own profile
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Create policy for users to insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create policy for users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Component Structure

```
/app/onboarding/
├── page.tsx                    # Main wizard container
├── types.ts                    # Zod schemas and TypeScript types
├── README.md                   # This file
├── components/
│   ├── progress-indicator.tsx  # Stepper component
│   ├── step-1-personal.tsx     # Personal info form
│   └── step-2-income.tsx       # Income form
└── hooks/
    └── use-auto-save.ts        # Auto-save to Supabase hook
```

## Testing Checklist

- [ ] Navigate through steps 1 & 2
- [ ] Verify auto-save works (check Supabase dashboard)
- [ ] Test back/next navigation
- [ ] Verify URL syncs with current step
- [ ] Test form validation (enter invalid values)
- [ ] Test on mobile (touch targets, numeric keyboard)
- [ ] Verify marital status disables spouse income for Single
- [ ] Check total income calculation updates in real-time
- [ ] Test browser refresh (should maintain progress)
- [ ] Verify authenticated users only can access

## Next Steps (Steps 3-5)

### Step 3: Monthly Expenses (Skippable)
- Total monthly expenses
- Rent/EMI amount
- Other major expenses

### Step 4: Net Worth (Skippable)
- Current net worth estimation
- Or quick asset entry

### Step 5: FIRE Goal
- Desired FIRE age
- Post-FIRE monthly expenses
- Auto-calculate FIRE number

## Technical Notes

- Uses `react-hook-form` with Zod validation
- Debounced auto-save (1 second) to reduce DB writes
- Offline-friendly (saves locally if connection fails)
- Supports browser back/forward buttons
- Mobile responsive with proper touch targets (44px min)
