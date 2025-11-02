# FireCFO - AI-Powered FIRE Planning App

## Project Overview
FireCFO helps Indians achieve Financial Independence Retire Early (FIRE) through AI-powered financial planning. Target users: 28-40 year olds earning ₹15L-50L annually.

## Tech Stack
- **Framework**: Next.js 14 (App Router, TypeScript, Turbopack)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: Supabase (PostgreSQL + Auth)
- **AI**: Anthropic Claude 3.5 Sonnet API
- **Charts**: Recharts
- **Deployment**: Vercel
- **Email**: Resend (for alerts)

## Key Features (MVP Scope)
1. User onboarding (5-step wizard)
2. FIRE Dashboard (progress, net worth, asset allocation)
3. AI Financial Advisor Chat
4. Net Worth Tracker (manual + CSV upload)
5. Tax Optimization Calculator (Indian Old Regime)
6. Proactive Alerts (rebalancing, tax deadlines)

## Database Schema

### Tables
- `user_profiles`: age, income, expenses, FIRE goals
- `assets`: user's investments (equity, debt, cash, etc.)
- `networth_history`: snapshots over time
- `chat_messages`: AI conversation history
- `alerts`: notifications and nudges

### Relationships
- One user → One profile
- One user → Many assets
- One user → Many chat messages
- One user → Many alerts

## Key Business Logic

### FIRE Calculation
- Required Corpus = (Annual Post-FIRE Expenses × 25) adjusted for inflation
- Use 4% Safe Withdrawal Rate
- Assumptions: 6% inflation, 12% pre-retirement returns, 8% post-retirement returns

### Asset Allocation
- Equity % = 100 - Age (min 30%, max 70%)
- Debt % = Age (min 20%, max 50%)
- Cash % = Remaining (typically 10-20%)
- Trigger rebalancing alert if deviation >10%

### Tax Calculation (FY 2025-26, Old Regime)
- Slabs: 0% up to ₹2.5L, 5% (₹2.5L-5L), 20% (₹5L-10L), 30% (>₹10L)
- Deductions: 80C (₹1.5L max), 80D (₹75K max), 80CCD1B (₹50K), 24(b) (₹2L)
- Add 4% cess on total tax

## Coding Conventions
- **File naming**: kebab-case (user-profile.tsx)
- **Component naming**: PascalCase (UserProfile)
- **API routes**: RESTful (`GET /api/assets`, `POST /api/chat/message`)
- **Error handling**: Always wrap API calls in try-catch, return proper status codes
- **Types**: Define TypeScript interfaces for all data models
- **Styling**: Use Tailwind + shadcn/ui only (no custom CSS files)

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
```

## Current Development Phase
Week 1-2: Foundation (Auth + Onboarding)

## Notes for AI
- Always use Indian financial terminology (₹, lakhs, crores)
- Prioritize simplicity over perfection (this is MVP)
- When unsure, ask before implementing complex solutions
- Test calculations manually before shipping