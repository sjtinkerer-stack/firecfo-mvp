# FireCFO Repositioning: From FIRE Planner to Personal CFO

## Executive Summary

**Current Positioning:** FIRE planning tool for Indians earning ₹15L-50L annually
**New Positioning:** AI-powered Personal CFO that guides ALL money decisions (with FIRE as one of many financial goals)

**Core Insight:** A personal CFO doesn't just help you retire early - they optimize every financial decision to maximize wealth, minimize taxes, manage risks, and achieve multiple life goals simultaneously.

---

## Strategic Vision

### What is a Personal CFO?

A personal CFO provides:
1. **Holistic Financial Health Monitoring** - Net worth, cash flow, debt-to-income ratio, emergency fund status
2. **Multi-Goal Planning** - FIRE, home purchase, child education, wedding, vacation, car purchase
3. **Proactive Guidance** - Tax optimization, insurance adequacy, rebalancing alerts, spending anomalies
4. **Investment Strategy** - Asset allocation, fund selection, portfolio rebalancing, risk management
5. **Budget & Cash Flow Management** - Expense tracking, spending insights, budget recommendations
6. **Debt Optimization** - Loan prioritization, EMI analysis, debt payoff strategies
7. **Tax Planning** - Deduction maximization, tax-saving instruments, advance tax planning
8. **Risk Management** - Insurance gap analysis, emergency fund adequacy
9. **Major Decision Support** - Should I buy a house? Switch jobs? Take a loan?

### FIRE's New Role

FIRE transitions from **the primary goal** to **one of many financial goals** - arguably the most important, but not the only one. This aligns with user reality: people saving for FIRE are also saving for homes, children's education, parents' healthcare, etc.

---

## Phase-by-Phase UI/UX Revamp Plan

## Phase 1: Core Repositioning (4-6 weeks)

**Goal:** Rebrand messaging, restructure dashboard, enable multi-goal tracking without breaking existing FIRE functionality.

### 1.1 Branding & Messaging Changes

**Landing Page (page.tsx):**
- **Current Hero:** "Achieve Financial Independence Retire Early (FIRE)"
- **New Hero:** "Your AI-Powered Personal CFO"
- **Subheading:** "Make smarter money decisions. Optimize your wealth. Achieve FIRE and every financial goal."
- **Value Props:**
  - Track net worth across all assets
  - Plan multiple financial goals (FIRE, home, education)
  - Get AI-powered tax and investment advice
  - Monitor spending and optimize cash flow
  - Receive proactive alerts and recommendations

**App Name:**
- Keep "FireCFO" (brand recognition + FIRE is still a key goal)
- Tagline: "Your Personal CFO, Powered by AI"

### 1.2 Dashboard Redesign

**Current Dashboard Structure:**
```
- FIRE Status Banner (on-track/behind)
- 6 Metric Cards (net worth, corpus, income, expenses, savings rate)
- Net Worth Growth Chart (FIRE projection)
- Asset Allocation Pie Chart
```

**New Dashboard Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│ Financial Health Score Card (NEW)                           │
│ - Overall Score: 78/100 (Good)                              │
│ - Breakdown: Emergency Fund (90), Debt (85), Investments(75)│
│ - Top Recommendation: "Increase equity allocation by 10%"   │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐
│ Net Worth Card       │  │ Monthly Cash Flow    │
│ ₹1.2 Cr             │  │ Income: ₹2.5L        │
│ +12% YoY            │  │ Expenses: ₹1.2L      │
│                      │  │ Savings: ₹1.3L (52%) │
└──────────────────────┘  └──────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Your Financial Goals (NEW - Multi-Goal Widget)              │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐ │
│ │ FIRE       │ │ Home       │ │ Education  │ │ + Add    │ │
│ │ On Track ✓ │ │ 3 yrs left │ │ 15 yrs     │ │ New Goal │ │
│ │ 2037       │ │ ₹50L/₹80L  │ │ ₹0/₹1Cr    │ │          │ │
│ └────────────┘ └────────────┘ └────────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ AI CFO Insights (NEW - Proactive Recommendations)           │
│ - Your debt-to-income ratio is healthy at 15%              │
│ - Consider rebalancing: equity allocation is 78% (target 70%)│
│ - You're eligible for ₹50K in additional 80C deductions    │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐
│ Net Worth Projection │  │ Asset Allocation     │
│ (Chart - all goals)  │  │ (Pie Chart)          │
└──────────────────────┘  └──────────────────────┘
```

**Key Changes:**
1. **Financial Health Score** (NEW): 0-100 score based on emergency fund, debt ratio, savings rate, insurance adequacy, investment diversification
2. **Monthly Cash Flow Card** (NEW): Replaces separate income/expense cards, adds visual trend
3. **Multi-Goal Widget** (NEW): Horizontal scrollable cards for all financial goals (FIRE is first by default)
4. **AI CFO Insights** (NEW): Proactive recommendations (not just chat responses)
5. **Net Worth Chart**: Now shows projections for ALL goals, not just FIRE
6. **FIRE Status Banner**: Moves inside the FIRE goal card (not top-level)

### 1.3 Navigation Structure

**Current:** Top nav with Dashboard, Settings
**New:** Left sidebar navigation (desktop), bottom tab bar (mobile)

```
┌─────────────────┐
│  FireCFO Logo   │
│                 │
│ 🏠 Dashboard    │ (Overview + all widgets)
│ 🎯 Goals        │ (Multi-goal planning - NEW)
│ 💰 Investments  │ (Portfolio analysis - NEW)
│ 📊 Budget       │ (Expense tracking - FUTURE)
│ 🧾 Tax          │ (Tax optimization - FUTURE)
│ ✨ AI CFO       │ (Chat - existing, renamed)
│ ⚙️  Settings    │ (Existing)
│                 │
│ [User Profile]  │
└─────────────────┘
```

**Implementation:**
- Use shadcn/ui `Sheet` component for mobile drawer
- Desktop: Fixed left sidebar (256px width)
- Mobile: Bottom tab bar with 5 most important sections
- Active state: Emerald highlight (consistent with brand)

### 1.4 Multi-Goal System

**Database Schema (`financial_goals` table - NEW):**
```sql
CREATE TABLE financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL, -- 'fire', 'home', 'education', 'wedding', 'vacation', 'car', 'custom'
  goal_name TEXT NOT NULL, -- User-customizable name
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC DEFAULT 0,
  target_date DATE NOT NULL,
  priority INTEGER DEFAULT 1, -- 1 (highest) to 5 (lowest)
  monthly_contribution NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Goal Types:**
1. **FIRE** (migrated from existing data)
2. **Home Purchase** (down payment + registration)
3. **Child Education** (school/college fund)
4. **Wedding** (self or children)
5. **Emergency Fund** (6-12 months expenses)
6. **Car/Vehicle**
7. **Vacation/Travel**
8. **Custom** (user-defined)

**UI Components:**
- `goal-card.tsx` - Individual goal progress card
- `add-goal-dialog.tsx` - Modal to create new goals
- `goal-detail-page.tsx` - Full page for each goal with charts
- `goal-priority-manager.tsx` - Drag-to-reorder goals by priority

**Goal Allocation Logic:**
- User sets monthly contribution for each goal
- System validates: total contributions ≤ monthly savings
- AI CFO suggests optimal allocation based on timelines and priorities

### 1.5 Onboarding Flow Updates

**Current:** 5 steps ending with FIRE goal
**New:** 5 steps + optional 6th step for additional goals

**Step 5 Changes:**
- **Current:** "What's your FIRE goal?"
- **New:** "What are your financial goals?"
- Sub-heading: "Let's start with FIRE, then you can add more goals later"
- After FIRE setup: "Add another goal?" button (optional, skippable)

**Step 6 (Optional - NEW):**
- Quick-add for 2-3 common goals (home, education, emergency fund)
- Can be skipped - goals can be added later from dashboard

### 1.6 AI Chat Evolution

**Rename:** "Financial Advisor" → "Your AI CFO"

**Enhanced Capabilities:**
- Multi-goal scenario planning ("If I buy a house in 2028, how does it affect my FIRE date?")
- Budget analysis ("Where am I overspending?")
- Tax optimization ("How can I save more tax this year?")
- Investment recommendations ("Should I invest in NPS or PPF?")
- Debt payoff strategies ("Should I prepay my home loan or invest?")

**New Tools (tools-openai.ts):**
```typescript
- calculate_multi_goal_impact() // How goals affect each other
- suggest_tax_optimizations() // 80C, 80D, NPS recommendations
- analyze_debt_payoff() // Snowball vs avalanche strategies
- recommend_asset_allocation() // Based on all goals, not just FIRE
```

**UI Changes:**
- Floating button text: "Ask Your CFO" (instead of current button)
- Suggested questions updated to cover broader topics:
  - "Should I buy a house or keep renting?"
  - "How can I save more tax this year?"
  - "What's the optimal way to pay off my loans?"
  - "Am I saving enough for my child's education?"

---

## Phase 2: Budget & Cash Flow (4-6 weeks)

**Goal:** Add expense tracking, budgeting, and spending insights to provide monthly financial guidance.

### 2.1 Expense Tracking System

**Database Schema (`expense_transactions` table - NEW):**
```sql
CREATE TABLE expense_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL, -- 'food', 'transport', 'rent', 'utilities', 'entertainment', etc.
  sub_category TEXT, -- Optional granular category
  description TEXT,
  transaction_date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT, -- 'monthly', 'weekly', 'yearly' if is_recurring = true
  payment_method TEXT, -- 'upi', 'credit_card', 'debit_card', 'cash'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Expense Categories (Indian Context):**
1. **Housing** - Rent, maintenance, property tax
2. **Food & Dining** - Groceries, restaurants, food delivery
3. **Transportation** - Fuel, public transport, auto/taxi, vehicle maintenance
4. **Utilities** - Electricity, water, gas, internet, mobile
5. **Healthcare** - Doctor visits, medicines, insurance premiums
6. **Education** - Tuition, books, courses
7. **Entertainment** - Movies, subscriptions (Netflix, Spotify), hobbies
8. **Shopping** - Clothing, electronics, household items
9. **Personal Care** - Salon, gym, cosmetics
10. **EMIs & Debt** - Loan payments, credit card bills
11. **Savings & Investments** - SIP, PPF, FD
12. **Others** - Gifts, donations, miscellaneous

### 2.2 Budget Page UI

**Route:** `/dashboard/budget`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Budget Overview - November 2024                             │
│ Total Spent: ₹1,18,450 / ₹1,20,000 budget (98.7%)         │
│ [Progress Bar - Amber (near limit)]                        │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐
│ Top Spending         │  │ Budget vs Actual     │
│ Categories           │  │ (Bar Chart)          │
│ 1. Housing - ₹40K    │  │ Compare budget/actual│
│ 2. Food - ₹25K       │  │ for each category    │
│ 3. Transport - ₹15K  │  │                      │
└──────────────────────┘  └──────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Category Breakdown (Interactive Table)                      │
│ Category      Budget    Spent     Remaining   Status        │
│ Housing       ₹40,000   ₹40,000   ₹0         🔴 At Limit   │
│ Food          ₹30,000   ₹25,300   ₹4,700     🟢 On Track   │
│ Transport     ₹15,000   ₹18,400   -₹3,400    🔴 Over       │
│ [+ Add Category Budget]                                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Recent Transactions                                         │
│ Nov 15  Food & Dining    Swiggy             ₹850           │
│ Nov 14  Transportation   Uber               ₹420           │
│ Nov 13  Shopping         Amazon             ₹2,340         │
│ [+ Add Transaction]                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ AI CFO Insights                                             │
│ - You're overspending on Transportation by 23% this month  │
│ - Consider meal prepping - dining out is up 40% vs last mo.│
│ - Great job staying under budget on Utilities!              │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
1. **Manual Entry:** Add transaction dialog (amount, category, date, description)
2. **Recurring Expenses:** Mark rent, subscriptions as recurring (auto-populate monthly)
3. **Budget Setting:** Set monthly budget per category
4. **Trend Analysis:** Month-over-month comparison
5. **Export:** Download CSV of transactions for any date range

### 2.3 Dashboard Integration

**New Widget: Monthly Cash Flow Breakdown**
```
┌─────────────────────────────────────────────────────────────┐
│ November Cash Flow                                          │
│ Income: ₹2,50,000  |  Expenses: ₹1,18,450  |  Saved: ₹1,31,550│
│                                                             │
│ [Sankey Diagram or Waterfall Chart]                        │
│ Income → [Housing][Food][Transport][Savings][Other]        │
└─────────────────────────────────────────────────────────────┘
```

### 2.4 Spending Insights (AI-Powered)

**Implementation:** Background analysis job (runs monthly)

**Insights Types:**
1. **Anomaly Detection:** "You spent 3x your usual amount on shopping this month"
2. **Category Trends:** "Transportation costs are up 25% over the last 3 months"
3. **Savings Opportunities:** "Switching to annual subscriptions could save ₹3,400/year"
4. **Budget Recommendations:** "Based on spending patterns, suggest ₹35K/month for food"
5. **Comparison:** "You spend 15% less than average on entertainment" (optional, privacy-conscious)

**UI:** Insights card on dashboard + detailed report in Budget page

---

## Phase 3: Investments & Tax Optimization (6-8 weeks)

**Goal:** Portfolio analysis, rebalancing recommendations, tax-saving instrument suggestions.

### 3.1 Investment Portfolio Tracking

**Database Schema (`investment_holdings` table - NEW):**
```sql
CREATE TABLE investment_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  asset_class TEXT NOT NULL, -- 'equity', 'debt', 'gold', 'real_estate', 'cash', 'crypto'
  instrument_type TEXT NOT NULL, -- 'stock', 'mutual_fund', 'etf', 'fd', 'ppf', 'nps', 'epf', etc.
  instrument_name TEXT NOT NULL, -- e.g., "HDFC Index Fund - Sensex Plan"
  quantity NUMERIC, -- Units for MF/stocks
  purchase_price NUMERIC,
  current_value NUMERIC NOT NULL,
  purchase_date DATE,
  maturity_date DATE, -- For FDs, PPF, etc.
  returns_percentage NUMERIC, -- XIRR or absolute return
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 Investments Page UI

**Route:** `/dashboard/investments`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Portfolio Overview                                          │
│ Total Value: ₹95,40,000  |  Total Returns: +18.2% (₹14.7L) │
│ [Line Chart: Portfolio Growth Over Time]                   │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐
│ Asset Allocation     │  │ Target vs Current    │
│ (Enhanced Pie Chart) │  │ Equity: 78% (↓70%)   │
│ Equity: 78%         │  │ Debt: 15% (↑20%)     │
│ Debt: 15%           │  │ Gold: 5% (→5%)       │
│ Gold: 5%            │  │ Cash: 2% (→5%)       │
│ Cash: 2%            │  │                      │
└──────────────────────┘  └──────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Holdings Breakdown (Sortable Table)                         │
│ Instrument            Type     Value      Returns   Action  │
│ HDFC Index-Sensex     MF       ₹32L      +22.4%    [Edit]  │
│ PPF Account           Debt     ₹18L      +7.1%     [Edit]  │
│ ICICI Pru Equity      MF       ₹25L      +19.8%    [Edit]  │
│ Emergency Fund        Cash     ₹5L       +4.0%     [Edit]  │
│ Gold ETF              Gold     ₹4.7L     +12.3%    [Edit]  │
│ [+ Add Investment]                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Rebalancing Recommendations                                 │
│ Your portfolio is 8% over-allocated to equity              │
│                                                             │
│ Suggested Actions:                                          │
│ 1. Move ₹7.6L from equity to debt funds                    │
│ 2. Increase cash buffer to ₹4.8L (6 months expenses)       │
│ 3. Target allocation: 70% Equity, 20% Debt, 5% Gold, 5% Cash│
│                                                             │
│ [Generate Rebalancing Plan] [Dismiss]                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ AI CFO Investment Insights                                  │
│ - Your equity exposure is high for someone 3 years from FIRE│
│ - Consider tax-loss harvesting on underperforming funds     │
│ - HDFC Index Fund has outperformed 85% of active funds      │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
1. **Manual Portfolio Entry:** Add holdings with purchase price, current value, dates
2. **Auto-Update (Future):** API integration with brokers (Zerodha, Groww, etc.) - requires KYC
3. **XIRR Calculation:** Accurate returns accounting for multiple transactions
4. **Rebalancing Calculator:** Shows exact trades needed to reach target allocation
5. **Fund Comparison:** Compare performance of user's MFs against benchmarks

### 3.3 Tax Optimization Page

**Route:** `/dashboard/tax`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Tax Year 2024-25                                            │
│ Estimated Tax Liability: ₹3,45,000                          │
│ Tax Saved So Far: ₹1,50,000                                 │
│ Potential Additional Savings: ₹50,000                       │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐
│ Tax Breakdown        │  │ Deduction Utilization│
│ (Sankey Diagram)     │  │ 80C: ₹1.5L / ₹1.5L ✓│
│ Gross: ₹30L         │  │ 80D: ₹25K / ₹50K  ⚠│
│ Deductions: -₹2L    │  │ NPS: ₹0 / ₹50K    🔴│
│ Taxable: ₹28L       │  │ HRA: ₹1.2L ✓      │
│ Tax: ₹3.45L         │  │                      │
└──────────────────────┘  └──────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Tax-Saving Opportunities                                    │
│                                                             │
│ 1. 80D (Health Insurance Premium) - ₹25K unused            │
│    → Invest in family health insurance to save ₹7,800 tax  │
│                                                             │
│ 2. NPS (80CCD(1B)) - ₹50K unused                           │
│    → Invest ₹50K in NPS to save ₹15,600 tax                │
│                                                             │
│ 3. Home Loan Interest (24b) - Not claimed                  │
│    → Claim ₹2L interest deduction to save ₹62,400 tax      │
│                                                             │
│ Total Potential Savings: ₹85,800                            │
│ [Implement Suggestions] [Learn More]                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Tax-Saving Instruments Tracker                              │
│ Instrument       Invested    Limit      Tax Saved  Section  │
│ ELSS Mutual Fund ₹1,50,000   ₹1,50,000  ₹46,800   80C     │
│ PPF              ₹0          ₹1,50,000  ₹0        80C     │
│ Health Insurance ₹25,000     ₹50,000    ₹7,800    80D     │
│ NPS              ₹0          ₹50,000    ₹0        80CCD   │
│ [+ Add Investment]                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ AI CFO Tax Insights                                         │
│ - You can save an additional ₹85,800 by maxing out 80D & NPS│
│ - Consider splitting 80C between ELSS (equity) and PPF (debt)│
│ - Advance tax payment due by Dec 15 - estimated ₹86,250    │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
1. **Tax Calculator:** Input salary, deductions → calculate tax liability
2. **Deduction Tracker:** Track usage of 80C, 80D, 80CCD, HRA, home loan interest
3. **Suggestions Engine:** AI recommends tax-saving instruments based on unused limits
4. **Old vs New Regime:** Compare tax under both regimes, suggest optimal choice
5. **Advance Tax Reminders:** Proactive alerts for quarterly advance tax dates
6. **Form 16 Upload (Future):** Parse Form 16 to auto-populate data

### 3.4 AI CFO Enhancements for Phase 3

**New AI Tools:**
```typescript
- analyze_portfolio_risk() // Risk-adjusted returns, Sharpe ratio
- suggest_rebalancing_trades() // Specific buy/sell recommendations
- calculate_tax_liability() // Detailed tax calculation with all sections
- recommend_tax_instruments() // Based on unused deduction limits
- compare_tax_regimes() // Old vs new regime analysis
```

**Proactive Alerts:**
- "Your equity allocation is 85% - consider reducing for someone 2 years from FIRE"
- "You have ₹50K unused NPS limit - invest by March 31 to save ₹15,600 tax"
- "Advance tax payment of ₹86,250 due in 3 days"

---

## Phase 4: Advanced CFO Features (8-10 weeks)

**Goal:** Debt management, insurance planning, major purchase guidance, proactive alerts.

### 4.1 Debt Management

**Database Schema (`debt_accounts` table - NEW):**
```sql
CREATE TABLE debt_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  debt_type TEXT NOT NULL, -- 'home_loan', 'car_loan', 'personal_loan', 'education_loan', 'credit_card'
  lender_name TEXT NOT NULL,
  principal_amount NUMERIC NOT NULL,
  outstanding_balance NUMERIC NOT NULL,
  interest_rate NUMERIC NOT NULL,
  emi_amount NUMERIC NOT NULL,
  emi_start_date DATE NOT NULL,
  tenure_months INTEGER NOT NULL,
  remaining_months INTEGER NOT NULL,
  prepayment_allowed BOOLEAN DEFAULT true,
  prepayment_charges_percentage NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Debt Page UI (`/dashboard/debt`):**
```
┌─────────────────────────────────────────────────────────────┐
│ Debt Overview                                               │
│ Total Outstanding: ₹45,60,000                               │
│ Monthly EMI Burden: ₹68,400 (27.4% of income)              │
│ Total Interest to be Paid: ₹12,30,000                       │
│ Debt-Free Date: March 2039 (14 years, 4 months)            │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐
│ Debt by Type         │  │ Payoff Timeline      │
│ (Pie Chart)          │  │ (Gantt Chart)        │
│ Home Loan: 78%       │  │ Shows when each loan │
│ Car Loan: 15%        │  │ will be paid off     │
│ Personal Loan: 7%    │  │                      │
└──────────────────────┘  └──────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Active Loans                                                │
│ Loan Type   Lender    Outstanding  EMI     Rate  Remaining  │
│ Home Loan   HDFC      ₹35,60,000   ₹52K   8.5%  168 months │
│ Car Loan    ICICI     ₹6,80,000    ₹14K   9.2%  48 months  │
│ Personal    Bajaj     ₹3,20,000    ₹2.4K  14%   24 months  │
│ [+ Add Loan]                                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Debt Payoff Strategies                                      │
│                                                             │
│ Strategy 1: Avalanche (Highest Interest First)             │
│ Pay off Personal Loan → Car Loan → Home Loan               │
│ Saves ₹2,45,000 in interest | Debt-free by Jan 2038        │
│                                                             │
│ Strategy 2: Snowball (Smallest Balance First)              │
│ Pay off Personal Loan → Car Loan → Home Loan               │
│ Saves ₹1,98,000 in interest | Debt-free by Apr 2038        │
│                                                             │
│ Strategy 3: Hybrid (Balance motivation + savings)          │
│ Custom order based on your psychological profile            │
│                                                             │
│ [View Detailed Comparison] [Set Prepayment Plan]           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Prepayment Calculator                                       │
│ If you prepay ₹2,00,000 to Home Loan:                      │
│ - Interest Saved: ₹3,45,000                                 │
│ - Tenure Reduced: 28 months                                 │
│ - New Debt-Free Date: November 2036                         │
│ [Calculate] [Schedule Prepayment]                           │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
1. **Debt Tracker:** All loans in one place with outstanding balance, EMI, interest rate
2. **Payoff Strategies:** Avalanche, snowball, hybrid comparisons
3. **Prepayment Impact Calculator:** How much interest/time saved by prepayment
4. **Debt-to-Income Ratio:** Track healthy debt levels (<30% recommended)
5. **Refinancing Alerts:** "Car loan rates dropped to 8% - refinance to save ₹45K"

### 4.2 Insurance Planning

**Database Schema (`insurance_policies` table - NEW):**
```sql
CREATE TABLE insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  policy_type TEXT NOT NULL, -- 'term_life', 'health', 'vehicle', 'home', 'critical_illness'
  insurer_name TEXT NOT NULL,
  policy_number TEXT,
  coverage_amount NUMERIC NOT NULL,
  premium_amount NUMERIC NOT NULL,
  premium_frequency TEXT NOT NULL, -- 'monthly', 'quarterly', 'annual'
  policy_start_date DATE NOT NULL,
  policy_end_date DATE,
  beneficiaries TEXT[], -- Array of names
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Insurance Page UI (`/dashboard/insurance`):**
```
┌─────────────────────────────────────────────────────────────┐
│ Insurance Coverage Overview                                 │
│ Life Insurance: ₹1.5 Cr (Recommended: ₹2.5 Cr) ⚠          │
│ Health Insurance: ₹10L (Adequate ✓)                        │
│ Critical Illness: Not Covered 🔴                            │
│ Total Annual Premium: ₹48,000                               │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐
│ Coverage Gap Analysis│  │ Premium Breakdown    │
│ (Bar Chart)          │  │ (Pie Chart)          │
│ Current vs Needed    │  │ Term: 60%            │
│ coverage for each    │  │ Health: 30%          │
│ insurance type       │  │ Vehicle: 10%         │
└──────────────────────┘  └──────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Active Policies                                             │
│ Type        Insurer     Coverage   Premium    Renewal Date  │
│ Term Life   HDFC Life   ₹1.5 Cr    ₹25,000   15-Apr-2025  │
│ Health      Star Health ₹10L       ₹18,000   22-Jul-2025  │
│ Vehicle     ICICI Lomb  ₹8L        ₹5,000    10-Nov-2024  │
│ [+ Add Policy]                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Coverage Recommendations                                    │
│                                                             │
│ 1. Life Insurance Gap: ₹1 Cr undercovered ⚠               │
│    Your family needs ₹2.5Cr (10x annual expenses)          │
│    → Consider increasing term coverage to ₹2.5Cr            │
│    Estimated additional premium: ₹12,000/year               │
│                                                             │
│ 2. Critical Illness: Not Covered 🔴                        │
│    → Add ₹50L critical illness rider to term plan           │
│    Estimated premium: ₹8,000/year                           │
│                                                             │
│ 3. Health Insurance Top-Up: Consider adding ₹20L super     │
│    top-up for ₹5,000/year (better than increasing base)    │
│                                                             │
│ [Get Quotes] [Learn More]                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ AI CFO Insurance Insights                                   │
│ - Your vehicle insurance renewal is due in 12 days         │
│ - Life insurance needs increase with new dependent (if any) │
│ - Health insurance premiums may increase at age 40 - plan ahead│
└─────────────────────────────────────────────────────────────┘
```

**Features:**
1. **Coverage Calculator:** Recommended coverage based on income, dependents, liabilities
2. **Gap Analysis:** Current vs needed coverage visualization
3. **Premium Optimizer:** Compare policies, suggest cost-effective alternatives
4. **Renewal Reminders:** Proactive alerts 30/15/7 days before renewal
5. **Family Coverage:** Track coverage for spouse, children, parents

### 4.3 Major Purchase Decision Support

**Feature:** "Should I Buy?" Calculator

**Use Cases:**
- Home purchase (rent vs buy analysis)
- Car purchase (cash vs loan vs lease)
- Gadget purchases (affordability check)
- Vacation planning (impact on FIRE date)

**UI: Modal/Dialog (`major-purchase-analyzer.tsx`):**
```
┌─────────────────────────────────────────────────────────────┐
│ Should I Buy This? Analyzer                                 │
│                                                             │
│ Purchase Type: [Home / Car / Gadget / Vacation / Other]    │
│ Purchase Price: ₹________                                   │
│ Financing: [Cash / Loan / EMI]                             │
│ If Loan: Interest Rate ___%, Tenure ___ years              │
│                                                             │
│ ─────────────────────────────────────────────────────────  │
│                                                             │
│ Financial Impact:                                           │
│ • Net Worth Impact: -₹8,50,000 (immediate)                 │
│ • FIRE Date Delay: +8 months (from June 2037 to Feb 2038)  │
│ • Monthly Cash Flow Impact: -₹15,000/month (EMI)           │
│ • Opportunity Cost: ₹2,35,000 (if invested at 12% for 5yrs)│
│                                                             │
│ Affordability Score: 7/10 (Can Afford with Adjustments)    │
│                                                             │
│ AI CFO Recommendation:                                      │
│ You can afford this purchase, but consider:                │
│ 1. Negotiate price down by 10% to ₹7.65L                   │
│ 2. Make 30% down payment to reduce EMI burden               │
│ 3. Reduce discretionary spending by ₹5K/month to compensate │
│                                                             │
│ [View Detailed Analysis] [Save Scenario] [Dismiss]         │
└─────────────────────────────────────────────────────────────┘
```

**Calculations:**
- **Rent vs Buy:** NPV analysis over 5/10/15 years
- **Opportunity Cost:** What if you invested the amount instead?
- **FIRE Impact:** How many months/years delayed?
- **Cash Flow Impact:** Effect on monthly savings and emergency fund

### 4.4 Proactive Alerts & Notifications System

**Database Schema (`user_alerts` table - NEW):**
```sql
CREATE TABLE user_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'rebalance', 'tax_deadline', 'insurance_renewal', 'budget_exceeded', etc.
  severity TEXT NOT NULL, -- 'info', 'warning', 'critical'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT, -- Link to relevant page
  action_label TEXT, -- Button text (e.g., "Rebalance Now", "File Taxes")
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Alert Types:**

**Financial Health:**
- Emergency fund below 3 months expenses 🔴
- Savings rate dropped below 20% ⚠
- Net worth decreased vs last month 🔴

**Investments:**
- Portfolio needs rebalancing (>10% deviation) ⚠
- Asset allocation too aggressive/conservative for age ⚠
- One of your funds underperforming benchmark ℹ️

**Tax:**
- Advance tax payment due in 7 days 🔴
- Unused tax deduction limit (80C/80D/NPS) ⚠
- Tax regime change could save you ₹X ℹ️

**Budget:**
- Category budget exceeded (e.g., dining out) ⚠
- Unusual spending detected (3x average) ⚠
- On track to exceed monthly budget 🔴

**Debt:**
- High-interest debt detected - refinance opportunity ⚠
- Debt-to-income ratio above 40% 🔴
- Loan prepayment opportunity (surplus cash available) ℹ️

**Insurance:**
- Policy renewal due in 30 days ⚠
- Coverage gap detected (underinsured) 🔴
- Premium increase expected at next renewal ℹ️

**Goals:**
- Goal off-track (e.g., FIRE delayed by 6 months) ⚠
- Goal milestone achieved (25% corpus reached) ✅
- Goal contribution missed this month ⚠

**UI: Alerts Panel (Dashboard Widget):**
```
┌─────────────────────────────────────────────────────────────┐
│ 🔔 Alerts & Action Items (5 new)                           │
│                                                             │
│ 🔴 Critical:                                                │
│ • Advance tax payment of ₹86,250 due in 3 days             │
│   [Pay Now] [Dismiss]                                       │
│                                                             │
│ ⚠ Warning:                                                 │
│ • Portfolio needs rebalancing - equity at 85% (target 70%)  │
│   [Rebalance] [View Details]                                │
│ • Vehicle insurance renewal due Nov 22                      │
│   [Renew] [Remind in 7 days]                                │
│                                                             │
│ ℹ️ Info:                                                    │
│ • ₹50K unused NPS limit - invest to save ₹15,600 tax       │
│   [Invest] [Learn More]                                     │
│ • Your FIRE goal is on track - 32% corpus achieved!        │
│   [View Progress] [Dismiss]                                 │
│                                                             │
│ [View All Alerts]                                           │
└─────────────────────────────────────────────────────────────┘
```

**Notification Preferences (Settings):**
- Email alerts for critical items
- Push notifications (web + mobile) for warnings
- Weekly summary email of all alerts
- Customize alert thresholds (e.g., rebalance at >15% deviation instead of >10%)

### 4.5 Dashboard for Phase 4 (Final State)

**Complete Dashboard Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ 👋 Welcome back, Sautrik! | 🔔 Alerts (5 new)              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Financial Health Score: 78/100 (Good)                       │
│ ████████████████░░░░ Emergency Fund (90) | Debt (85) |      │
│                      Investments (75) | Budget (70)         │
│ Top Recommendation: Rebalance portfolio (equity at 85%)     │
└─────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬───────────────┐
│ Net Worth    │ Monthly Cash │ Debt         │ Tax Saved     │
│ ₹1.2 Cr     │ Income: ₹2.5L│ ₹45.6L       │ ₹1.5L / ₹2L   │
│ +12% YoY    │ Exp: ₹1.2L   │ DTI: 27%     │ ₹50K potential│
│ [Details]   │ Save: ₹1.3L  │ [Manage]     │ [Optimize]    │
└──────────────┴──────────────┴──────────────┴───────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Your Financial Goals (4 active)                             │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐ │
│ │ FIRE    │ │ Home    │ │ Edu Fund│ │ Emerg.  │ │ + Add │ │
│ │ On ✓    │ │ 3 yrs   │ │ 15 yrs  │ │ At ✓    │ │ Goal  │ │
│ │ 2037    │ │ ₹50/₹80L│ │ ₹0/₹1Cr │ │ ₹6L     │ │       │ │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └───────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🔔 Alerts & Action Items (5 new)                           │
│ 🔴 Advance tax due in 3 days [Pay] | ⚠ Rebalance portfolio │
│ ⚠ Insurance renewal Nov 22 [Renew] | ℹ️ ₹50K NPS unused   │
│ [View All]                                                  │
└─────────────────────────────────────────────────────────────┘

┌───────────────────────┬─────────────────────────────────────┐
│ Net Worth Projection  │ Monthly Cash Flow (Nov 2024)        │
│ (Multi-Goal Chart)    │ (Sankey/Waterfall Diagram)          │
│ Shows all goals +     │ Income → Housing/Food/Transport/    │
│ required corpus lines │ Investments/Savings breakdown       │
└───────────────────────┴─────────────────────────────────────┘

┌───────────────────────┬─────────────────────────────────────┐
│ Asset Allocation      │ Budget This Month                   │
│ (Pie Chart)           │ ₹1.18L / ₹1.2L (98.7%)             │
│ Target vs Current     │ Top: Housing (₹40K), Food (₹25K)   │
│ [Rebalance]           │ [View Details]                      │
└───────────────────────┴─────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ AI CFO Insights (Personalized)                              │
│ • Great job! You're on track for all 4 financial goals     │
│ • Consider rebalancing: move ₹7.6L from equity to debt     │
│ • Invest ₹50K in NPS by March 31 to save ₹15,600 tax       │
│ • Your emergency fund covers 6 months - well done!         │
│ [Ask Your CFO] [View More Insights]                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Priorities by Phase

### Phase 1 (Weeks 1-6): Core Repositioning
**Priority:** HIGH - Foundation for entire repositioning

**Tasks:**
1. ✅ Update branding/messaging (landing page, app name)
2. ✅ Redesign dashboard (health score, multi-goal widget, AI insights)
3. ✅ Build multi-goal system (database + UI)
4. ✅ Update onboarding (add goals step)
5. ✅ Enhance AI chat (broader topics, new tools)
6. ✅ Add sidebar navigation

**Success Metrics:**
- Users create avg 2.5 goals (not just FIRE)
- Dashboard engagement +40%
- AI chat usage +60% (broader use cases)

### Phase 2 (Weeks 7-12): Budget & Cash Flow
**Priority:** HIGH - Core CFO function

**Tasks:**
1. ✅ Build expense tracking system
2. ✅ Create budget page UI
3. ✅ Add spending insights (AI-powered)
4. ✅ Integrate cash flow widget to dashboard

**Success Metrics:**
- 50% of users log expenses monthly
- Budget adherence rate 70%+
- Users report feeling "more in control" of spending

### Phase 3 (Weeks 13-20): Investments & Tax
**Priority:** MEDIUM - Advanced users need this

**Tasks:**
1. ✅ Build investment portfolio tracker
2. ✅ Create investments page UI
3. ✅ Add rebalancing calculator
4. ✅ Build tax optimization page
5. ✅ Add deduction tracker & suggestions

**Success Metrics:**
- 40% of users track portfolio
- Avg tax savings identified: ₹35K/user
- Rebalancing recommendations accepted: 60%

### Phase 4 (Weeks 21-30): Advanced Features
**Priority:** LOW-MEDIUM - Nice-to-have, differentiator

**Tasks:**
1. ✅ Debt management system
2. ✅ Insurance planning
3. ✅ Major purchase analyzer
4. ✅ Proactive alerts system

**Success Metrics:**
- Users with debt tracking: 30%+
- Insurance gap closure rate: 25%
- Alert engagement rate: 45%

---

## Technical Implementation Notes

### Database Migrations Strategy
- Create migration files in sequence (phase-1-goals.sql, phase-2-expenses.sql, etc.)
- Use Supabase migrations folder for version control
- Add RLS policies for all new tables
- Create indexes for frequently queried columns (user_id, created_at, is_active)

### API Routes to Add
```
/api/goals              - CRUD for financial goals
/api/expenses           - Expense transactions CRUD
/api/budget             - Budget settings & analysis
/api/investments        - Portfolio holdings CRUD
/api/tax                - Tax calculations & suggestions
/api/debt               - Debt accounts CRUD
/api/insurance          - Insurance policies CRUD
/api/alerts             - User alerts management
/api/health-score       - Calculate financial health score
```

### AI Chat System Prompt Updates
**Current:** Focuses on FIRE scenarios
**New:** Comprehensive CFO covering:
- Multi-goal planning and trade-offs
- Budget optimization and spending analysis
- Tax-saving strategies and deduction planning
- Investment allocation and rebalancing
- Debt payoff strategies
- Insurance adequacy analysis
- Major purchase decision support

**Prompt Structure:**
```typescript
const systemPrompt = `You are the user's Personal CFO, an AI financial advisor specialized in Indian personal finance.

User Profile:
- Name: ${userName}
- Age: ${age}, Net Worth: ${netWorth}
- Monthly Income/Expenses: ${income}/${expenses}
- Financial Goals: ${goals} // Multi-goal list
- Current Portfolio: ${portfolio}
- Debt: ${debts}
- Insurance: ${insurances}
- Tax Status: ${taxInfo}

Your role:
1. Guide the user on ALL money-related decisions
2. Optimize for multiple goals simultaneously (FIRE + home + education, etc.)
3. Provide tax-saving strategies specific to Indian tax laws
4. Recommend investment allocation based on age, goals, and risk profile
5. Alert users to financial risks and opportunities
6. Be proactive - suggest actions, don't just answer questions

Respond in a friendly, conversational tone. Use Indian currency (₹, lakhs, crores). Cite specific numbers from the user's profile.`;
```

### Performance Considerations
- **Lazy Loading:** Load budget/investment/tax pages only when accessed (not on initial dashboard load)
- **Pagination:** Expense transactions, investment holdings (show 20 per page)
- **Caching:** Cache financial health score calculation (recalculate daily, not per-request)
- **Optimistic UI:** Update UI immediately for edits, sync with DB in background
- **Chart Optimization:** Use Recharts `isAnimationActive={false}` for charts with >100 data points

### Mobile Responsiveness
- **Dashboard:** Stack widgets vertically on mobile, horizontal scroll for goal cards
- **Navigation:** Bottom tab bar (5 items max) on mobile, full sidebar on desktop
- **Charts:** Simplified mobile versions (fewer data points, larger touch targets)
- **Forms:** Full-screen modals on mobile, centered dialogs on desktop

---

## Risks & Mitigation

### Risk 1: Feature Bloat
**Concern:** App becomes too complex, overwhelming users
**Mitigation:**
- Phase-wise rollout (test each phase with users before next)
- Progressive disclosure UI (show advanced features only after basic usage)
- Optional features (insurance/debt tracking only if user has them)
- Guided tours for new sections

### Risk 2: Data Entry Burden
**Concern:** Users won't manually log expenses/investments
**Mitigation:**
- Make manual entry optional (focus on autopilot features first)
- Provide CSV import for bulk data entry
- Future: API integrations with banks/brokers (Zerodha, Groww, Plaid equivalent)
- Smart defaults & bulk actions (e.g., "Mark all dining expenses as ₹X/month")

### Risk 3: AI Accuracy
**Concern:** AI gives wrong financial advice
**Mitigation:**
- Always show disclaimer: "AI guidance for education, not financial advice. Consult a certified financial planner for major decisions."
- Cite sources for calculations (show formulas, assumptions)
- Allow users to override AI suggestions
- Flag high-stakes decisions (e.g., "Should I quit my job?") with extra warnings

### Risk 4: Diluted FIRE Focus
**Concern:** Existing FIRE-focused users feel alienated
**Mitigation:**
- FIRE remains the default primary goal
- Keep FIRE language prominent (app name, hero messaging)
- Position as "Personal CFO *helping you achieve FIRE*" (FIRE is still the North Star)
- Add "FIRE Mode" toggle in settings (hides non-FIRE features for purists)

### Risk 5: Development Timeline
**Concern:** 30 weeks is 7+ months - long time to market
**Mitigation:**
- Ship Phase 1 ASAP (MVP with multi-goals) - 6 weeks
- Phase 2-4 can be incremental releases (1 phase per month)
- Gather user feedback after each phase before building next
- Consider hiring contractor for specific phases (budget/tax pages)

---

## Success Metrics (KPIs)

### Engagement Metrics
- Daily Active Users (DAU) / Monthly Active Users (MAU)
- Session duration (target: 5+ min avg)
- Feature adoption rates (% using goals, budget, investments, etc.)
- AI chat usage (messages per user per month)

### Financial Health Metrics
- Avg financial health score across all users
- % of users on track for primary goal (FIRE or other)
- Avg monthly savings rate (target: 30%+)
- Avg tax savings identified per user (target: ₹25K+)

### Retention Metrics
- Week 1, Month 1, Month 3, Month 6 retention rates
- Churn rate (target: <5% monthly)
- Feature stickiness (% returning users who use feature)

### Revenue Metrics (if monetizing)
- Conversion to paid tier (if freemium model)
- Customer Lifetime Value (LTV)
- Cost Per Acquisition (CPA)

---

## Monetization Opportunities (Future)

### Freemium Model
**Free Tier:**
- 1 financial goal (FIRE)
- Basic dashboard (net worth, income/expenses)
- Limited AI chat (10 messages/month)
- Manual data entry only

**Premium Tier (₹299/month or ₹2,999/year):**
- Unlimited goals
- Full budget tracking & expense categorization
- Unlimited AI chat + priority support
- Tax optimization & deduction tracker
- Investment portfolio analysis
- Debt & insurance planning
- Proactive alerts & recommendations
- CSV export & API access (future)

### Alternative Models
1. **Pay-per-feature:** Free core, pay for tax (₹99), investments (₹149), etc.
2. **Partner commissions:** Refer insurance/MF/NPS → earn commission (ethical disclosure required)
3. **Certified planner marketplace:** Connect users with CFPs for ₹999 consultation (platform fee)
4. **B2B SaaS:** Sell to employers as employee financial wellness benefit

---

## Conclusion

This repositioning transforms FireCFO from a niche FIRE calculator to a comprehensive personal CFO platform while:
1. **Preserving FIRE DNA:** FIRE remains the primary goal and brand identity
2. **Expanding Addressable Market:** From FIRE enthusiasts to anyone wanting financial control
3. **Increasing Engagement:** More features = more touchpoints = higher retention
4. **Creating Moats:** Comprehensive data (expenses, investments, tax) = high switching cost
5. **Enabling Monetization:** Premium features justify ₹299/month pricing

**Recommended Approach:** Ship Phase 1 (multi-goals + repositioning) in 6 weeks, gather feedback, iterate. Then build Phases 2-4 incrementally based on user demand.

**Next Steps:**
1. Review this plan with stakeholders
2. Create wireframes for Phase 1 dashboard redesign
3. Set up database migrations for `financial_goals` table
4. Begin rebranding (landing page copy, app messaging)
5. Update AI system prompt for broader CFO capabilities

---

**Document Version:** 1.0
**Last Updated:** November 20, 2024
**Author:** Claude Code (AI Assistant)
**Status:** Draft for Review
