# FireCFO MVP - System Architecture Diagram

## High-Level Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer - Browser"
        A[Landing Page] --> B[Authentication]
        B --> C[Onboarding Wizard]
        C --> D[Dashboard]
        D --> E[Settings & Modals]

        F[React 19 + Next.js 16]
        G[Tailwind CSS + Framer Motion]
        H[Recharts + Radix UI]
    end

    subgraph "Application Layer - Next.js App Router"
        I[Middleware<br/>Auth Check & Routing]
        J[API Routes<br/>/auth/callback]
        K[Server Components]
        L[Client Components]
    end

    subgraph "Backend Services"
        M[Supabase PostgreSQL<br/>Database]
        N[Supabase Auth<br/>JWT + OAuth]
        O[Google OAuth Provider]
        P[LinkedIn OAuth Provider]
    end

    subgraph "Future Integrations"
        Q[Anthropic Claude API<br/>AI Financial Advisor]
        R[Resend API<br/>Email Notifications]
    end

    A --> I
    B --> I
    C --> I
    D --> I
    E --> I

    I --> J
    I --> K
    I --> L

    J --> N
    K --> M
    L --> M
    L --> N

    N --> O
    N --> P

    D -.Future.-> Q
    D -.Future.-> R

    style Q fill:#f9f,stroke:#333,stroke-width:2px,stroke-dasharray: 5 5
    style R fill:#f9f,stroke:#333,stroke-width:2px,stroke-dasharray: 5 5
```

## Detailed Component Architecture

```mermaid
graph TB
    subgraph "Frontend - Pages & Routes"
        A1["/app/page.tsx<br/>Landing Page"]
        A2["/app/login/page.tsx<br/>Login Page"]
        A3["/app/signup/page.tsx<br/>Signup Page"]
        A4["/app/onboarding/page.tsx<br/>5-Step Wizard"]
        A5["/app/dashboard/page.tsx<br/>FIRE Dashboard"]
        A6["/app/dashboard/settings/page.tsx<br/>Settings Page"]
    end

    subgraph "Frontend - Components"
        B1[LoginForm + SignupForm]
        B2[OnboardingSteps 1-5<br/>Personal, Income, Expenses,<br/>Net Worth, FIRE Goal]
        B3[DashboardOverview<br/>Progress Bar, Charts]
        B4[Edit Modals<br/>Personal, Income, Assets,<br/>FIRE Goal]
    end

    subgraph "Frontend - Hooks & State"
        C1[useAutoSave<br/>Debounced Save - 500ms]
        C2[useDashboardData<br/>Data Fetch & Refetch]
        C3[React Hook Form<br/>+ Zod Validation]
    end

    subgraph "Business Logic Layer"
        D1[FIRE Calculations<br/>LIA, SWR, Corpus]
        D2[Form Validation<br/>Zod Schemas]
        D3[Date & Currency Utils]
        D4[Scroll & Navigation]
    end

    subgraph "Authentication & Routing"
        E1[middleware.ts<br/>Route Protection]
        E2[/auth/callback/route.ts<br/>OAuth Handler]
        E3[lib/supabase.ts<br/>Singleton Client]
    end

    subgraph "Database Layer - Supabase"
        F1[(user_profiles Table<br/>UUID PK, 40+ columns)]
        F2[Row Level Security<br/>RLS Policies]
        F3[Auth Users Table<br/>JWT Management]
    end

    A1 --> E1
    A2 --> B1
    A3 --> B1
    A4 --> B2
    A5 --> B3
    A6 --> B4

    B1 --> E3
    B2 --> C1
    B2 --> C3
    B3 --> C2
    B4 --> C2

    C1 --> D1
    C1 --> E3
    C2 --> E3
    C3 --> D2

    D1 --> E3
    E1 --> E2
    E2 --> E3
    E3 --> F1
    E3 --> F3

    F1 --> F2
    F3 --> F2
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Middleware
    participant Frontend
    participant Supabase
    participant OAuth

    Note over User,OAuth: Authentication Flow
    User->>Browser: Visit /login
    Browser->>Middleware: Check auth status
    Middleware->>Supabase: Validate JWT
    Supabase-->>Middleware: Not authenticated
    Middleware-->>Browser: Allow access to /login

    User->>Frontend: Click "Sign in with Google"
    Frontend->>Supabase: initiate OAuth
    Supabase->>OAuth: Redirect to Google
    OAuth-->>Browser: Authorization consent
    User->>OAuth: Approve
    OAuth->>Supabase: Auth code
    Supabase->>Middleware: Callback to /auth/callback
    Middleware->>Supabase: Exchange code for JWT
    Supabase-->>Middleware: JWT + User ID
    Middleware->>Browser: Set cookie + redirect

    Note over User,OAuth: Onboarding Flow
    Browser->>Middleware: Navigate to /onboarding
    Middleware->>Supabase: Check onboarding status
    Supabase-->>Middleware: onboarding_completed = false
    Middleware-->>Browser: Allow access

    User->>Frontend: Fill Step 1 (Personal Info)
    Frontend->>Frontend: Validate with Zod
    Frontend->>Frontend: useAutoSave (500ms debounce)
    Frontend->>Supabase: UPSERT user_profiles
    Supabase-->>Frontend: Success

    User->>Frontend: Complete Step 5 (FIRE Goal)
    Frontend->>Frontend: Calculate metrics
    Frontend->>Supabase: Update with calculations
    Frontend->>Supabase: Set onboarding_completed = true
    Supabase-->>Frontend: Success
    Frontend->>Browser: Redirect to /dashboard

    Note over User,OAuth: Dashboard Flow
    Browser->>Middleware: Navigate to /dashboard
    Middleware->>Supabase: Validate JWT + check onboarding
    Supabase-->>Middleware: Authenticated + onboarded
    Middleware-->>Browser: Allow access

    Frontend->>Frontend: useDashboardData hook
    Frontend->>Supabase: SELECT user_profiles WHERE id = user.id
    Supabase->>Supabase: RLS Policy Check
    Supabase-->>Frontend: User profile data
    Frontend->>Frontend: Transform & validate
    Frontend->>Browser: Render dashboard

    Note over User,OAuth: Update Flow
    User->>Frontend: Open Edit Modal
    Frontend->>Browser: Display current values
    User->>Frontend: Submit changes
    Frontend->>Frontend: Validate with Zod
    Frontend->>Supabase: UPDATE user_profiles
    Supabase->>Supabase: RLS Policy Check
    Supabase-->>Frontend: Success
    Frontend->>Frontend: refetch()
    Frontend->>Supabase: SELECT updated data
    Supabase-->>Frontend: Fresh data
    Frontend->>Browser: Update UI
```

## Database Schema

```mermaid
erDiagram
    AUTH_USERS ||--|| USER_PROFILES : "has one"

    AUTH_USERS {
        uuid id PK
        timestamp created_at
        string email UK
        string encrypted_password
        jsonb raw_user_meta_data
    }

    USER_PROFILES {
        uuid id PK "FK to auth.users"
        timestamp created_at
        timestamp updated_at
        boolean onboarding_completed "Default: false"

        date date_of_birth "Step 1"
        text city "Step 1"
        enum marital_status "Step 1: Single|Married"
        integer dependents "Step 1: 0-10"

        integer monthly_income "Step 2: ₹10k-₹50L"
        integer spouse_income "Step 2: Optional"

        integer monthly_expenses "Step 3: ₹5k-₹1Cr"
        integer rent_amount "Step 3: For future use"

        numeric equity "Step 4: 15,2 precision"
        numeric debt "Step 4"
        numeric cash "Step 4"
        numeric real_estate "Step 4"
        numeric other_assets "Step 4"

        date fire_target_date "Step 5: Computed"
        integer fire_target_age "Step 5: 18-80"
        enum fire_lifestyle_type "Step 5: lean|standard|fat"

        numeric post_fire_monthly_expense "Calculated"
        numeric required_corpus "Calculated"
        numeric projected_corpus_at_fire "Calculated"
        numeric monthly_savings_needed "Calculated"
        boolean is_on_track "Calculated"
        numeric lifestyle_inflation_adjustment "Calculated: 5-20%"
        numeric safe_withdrawal_rate "Calculated: 3.5-4.5%"
    }
```

## Technology Stack Layers

```mermaid
graph TB
    subgraph "Layer 1: User Interface"
        A1[React 19.2.0]
        A2[Next.js 16.0.1<br/>App Router]
        A3[Tailwind CSS 4]
        A4[Framer Motion 12]
        A5[Radix UI + shadcn/ui]
    end

    subgraph "Layer 2: State & Form Management"
        B1[React Hook Form 7.66]
        B2[Zod 4.1.12<br/>Schema Validation]
        B3[Custom Hooks<br/>useAutoSave, useDashboardData]
    end

    subgraph "Layer 3: Data Visualization"
        C1[Recharts 3.3.0]
        C2[Lucide React Icons]
        C3[date-fns 4.1.0]
    end

    subgraph "Layer 4: Client Libraries"
        D1[Supabase JS Client<br/>@supabase/supabase-js]
        D2[Supabase SSR<br/>@supabase/ssr]
    end

    subgraph "Layer 5: Backend Services"
        E1[Supabase PostgreSQL 15+]
        E2[Supabase Auth<br/>JWT + OAuth2]
        E3[Row Level Security]
    end

    subgraph "Layer 6: External Providers"
        F1[Google OAuth]
        F2[LinkedIn OAuth]
        F3[Anthropic Claude API<br/>Future]
        F4[Resend Email API<br/>Future]
    end

    A1 --> B1
    A2 --> B1
    A3 --> A2
    A4 --> A2
    A5 --> A1

    B1 --> B2
    B1 --> B3
    B3 --> D1

    C1 --> A1
    C2 --> A1
    C3 --> B3

    D1 --> E1
    D2 --> E2

    E1 --> E3
    E2 --> E3
    E2 --> F1
    E2 --> F2

    style F3 fill:#f9f,stroke:#333,stroke-width:2px,stroke-dasharray: 5 5
    style F4 fill:#f9f,stroke:#333,stroke-width:2px,stroke-dasharray: 5 5
```

## Security Architecture

```mermaid
graph TB
    subgraph "Layer 1: Client Security"
        A1[HTTPS Only]
        A2[No Sensitive Data in LocalStorage]
        A3[Form Validation<br/>Zod Schemas]
        A4[TypeScript Strict Mode]
    end

    subgraph "Layer 2: Transport Security"
        B1[HTTP-Only Cookies]
        B2[Secure Cookie Flag]
        B3[SameSite Cookie Policy]
        B4[CORS Configuration]
    end

    subgraph "Layer 3: Application Security"
        C1[Next.js Middleware<br/>Route Protection]
        C2[JWT Token Validation]
        C3[Session Refresh Logic]
        C4[OAuth State Validation]
    end

    subgraph "Layer 4: Database Security"
        D1[Row Level Security<br/>RLS Policies]
        D2[User Isolation<br/>auth.uid check]
        D3[Prepared Statements<br/>SQL Injection Prevention]
        D4[Connection Encryption]
    end

    subgraph "Layer 5: Authentication"
        E1[Password Min 8 Chars]
        E2[Email Verification]
        E3[OAuth2 Flow]
        E4[JWT Expiration]
    end

    A1 --> B1
    A2 --> B1
    A3 --> C1
    A4 --> C1

    B1 --> C1
    B2 --> C1
    B3 --> C1
    B4 --> C1

    C1 --> D1
    C2 --> D1
    C3 --> E4
    C4 --> E3

    D1 --> D2
    D2 --> D3
    D3 --> D4

    E1 --> E2
    E2 --> E3
    E3 --> E4
```

## Deployment Architecture

```mermaid
graph LR
    subgraph "Developer Environment"
        A1[Local Development<br/>npm run dev]
        A2[Git Repository<br/>GitHub]
    end

    subgraph "CI/CD Pipeline"
        B1[Vercel<br/>Auto Deploy]
        B2[Build Process<br/>next build]
        B3[TypeScript Check]
        B4[ESLint]
    end

    subgraph "Production Environment"
        C1[Vercel Edge Network<br/>Global CDN]
        C2[Next.js Server<br/>Serverless Functions]
        C3[Static Assets<br/>/_next/static]
    end

    subgraph "External Services"
        D1[Supabase Cloud<br/>Database + Auth]
        D2[OAuth Providers<br/>Google + LinkedIn]
    end

    subgraph "Monitoring & Analytics"
        E1[Vercel Analytics]
        E2[Error Tracking<br/>Future: Sentry]
    end

    A1 --> A2
    A2 --> B1
    B1 --> B2
    B2 --> B3
    B3 --> B4
    B4 --> C1

    C1 --> C2
    C1 --> C3

    C2 --> D1
    C2 --> D2

    C1 --> E1
    C2 -.Future.-> E2
```

## Feature Module Map

```mermaid
mindmap
  root((FireCFO MVP))
    Authentication
      Email + Password
      Google OAuth
      LinkedIn OAuth
      Session Management
    Onboarding Wizard
      Step 1: Personal Info
        Age DOB City
        Marital Status
        Dependents
      Step 2: Income
        Monthly Income
        Spouse Income
      Step 3: Expenses
        Monthly Expenses
        Rent Component
      Step 4: Net Worth
        Equity
        Debt
        Cash
        Real Estate
        Other Assets
      Step 5: FIRE Goal
        Target Age
        Lifestyle Type
        Auto Calculations
    Dashboard
      Overview
        Progress Bar
        FIRE Timeline
        Net Worth Display
      Metrics
        Required Corpus
        Monthly Savings
        On Track Status
      Charts
        Asset Allocation Pie
        Projection Line Chart
      Settings
        Edit Personal Info
        Edit Income Expenses
        Edit Assets
        Edit FIRE Goal
    Future Features
      AI Financial Advisor
        Claude Integration
        Chat Interface
        Personalized Advice
      Tax Optimization
        Tax Calculations
        Deductions
        Strategies
      Alerts System
        Email Notifications
        Tax Deadlines
        Rebalancing Nudges
      Net Worth Tracking
        Historical Snapshots
        Progress Charts
```

## FIRE Calculation Flow

```mermaid
flowchart TD
    A[User Input Data] --> B{All Steps Complete?}
    B -->|No| C[Continue Onboarding]
    B -->|Yes| D[Calculate Current Age]

    D --> E[Years to FIRE = Target Age - Current Age]

    E --> F[Calculate Lifestyle Inflation Adjustment]
    F --> F1[Base: 8%]
    F1 --> F2[+ Age Factor: -2% to +3%]
    F2 --> F3[+ Dependents Factor: 0% to +5%]
    F3 --> F4[+ Savings Rate Factor: -5% to +5%]
    F4 --> F5[+ Lifestyle Type: -5% to +10%]
    F5 --> F6[Clamp: 5% to 20%]

    F6 --> G[Calculate Post-FIRE Monthly Expense]
    G --> G1[= Monthly Expenses × 1 + LIA]

    G1 --> H[Determine Safe Withdrawal Rate]
    H --> H1{Years to FIRE}
    H1 -->|≤ 10 years| H2[SWR = 3.5%]
    H1 -->|11-20 years| H3[SWR = 4.0%]
    H1 -->|> 20 years| H4[SWR = 4.5%]

    H2 --> I[Calculate Annual Post-FIRE Expenses]
    H3 --> I
    H4 --> I
    I --> I1[= Post-FIRE Monthly × 12]

    I1 --> J[Calculate Required Corpus]
    J --> J1[= Annual Expenses / SWR]
    J1 --> J2[× 1.06 ^ Years to FIRE<br/>Inflation Adjustment]

    J2 --> K[Calculate Current Net Worth]
    K --> K1[= Equity + Debt + Cash + Real Estate + Other]

    K1 --> L[Calculate Projected Corpus]
    L --> L1[= Current Net Worth × 1.12 ^ Years to FIRE<br/>12% Annual Growth]

    L1 --> M{Projected Corpus >= Required Corpus?}
    M -->|Yes| N[is_on_track = TRUE]
    M -->|No| O[is_on_track = FALSE]

    N --> P[Calculate Monthly Savings Needed]
    O --> P

    P --> P1[= Required Corpus - Projected Corpus]
    P1 --> P2[/ Months Remaining]
    P2 --> P3[If negative, set to 0]

    P3 --> Q[Save All Calculations to Database]
    Q --> R[Display Dashboard]

    style M fill:#ff9,stroke:#333,stroke-width:3px
    style N fill:#9f9,stroke:#333,stroke-width:2px
    style O fill:#f99,stroke:#333,stroke-width:2px
```

---

## Key Architectural Characteristics

### 1. **Architecture Pattern**
- **Monolithic** Next.js application with **Backend-as-a-Service (BaaS)** via Supabase
- **Client-Server** with serverless backend functions
- **Single Page Application (SPA)** with server-side routing

### 2. **Core Technologies**
| Layer | Technology | Version |
|-------|------------|---------|
| Frontend Framework | React | 19.2.0 |
| Meta Framework | Next.js (App Router) | 16.0.1 |
| Styling | Tailwind CSS | 4 |
| Database | Supabase (PostgreSQL) | 15+ |
| Authentication | Supabase Auth | - |
| Form Management | React Hook Form + Zod | 7.66 + 4.1 |
| Charts | Recharts | 3.3.0 |
| Animation | Framer Motion | 12.23 |

### 3. **Data Flow Pattern**
1. **User Input** → React Hook Form
2. **Validation** → Zod Schema
3. **Auto-Save** → useAutoSave hook (500ms debounce)
4. **API Call** → Supabase JS Client
5. **Database** → PostgreSQL with RLS
6. **Response** → Transform to TypeScript types
7. **UI Update** → React state + re-render

### 4. **Security Measures**
- **Authentication**: JWT tokens in HTTP-only cookies
- **Authorization**: Row Level Security (RLS) at database level
- **Transport**: HTTPS only, secure cookies
- **Validation**: Zod schemas + TypeScript strict mode
- **OAuth**: Server-side callback handler

### 5. **Performance Optimizations**
- **Debounced auto-save**: 500ms delay reduces DB calls
- **Singleton Supabase client**: Single instance prevents overhead
- **Client-side calculations**: Reduces server load
- **Server components**: Next.js optimizations
- **Edge deployment**: Vercel global CDN

### 6. **Scalability Considerations**
- **Serverless architecture**: Auto-scaling via Vercel
- **Managed database**: Supabase handles scaling
- **Stateless auth**: JWT tokens enable horizontal scaling
- **CDN delivery**: Static assets globally distributed

### 7. **Development Workflow**
```
Code Change → ESLint → TypeScript Check → Local Dev Server
     ↓
Git Commit → Push to GitHub
     ↓
Vercel Auto-Deploy → Build → Type Check → Deploy to Production
```

### 8. **Future Architecture Evolution**
- **AI Integration**: Anthropic Claude API for financial advice
- **Email System**: Resend API for notifications
- **Data Analytics**: Historical net worth tracking
- **Real-time Updates**: Supabase real-time subscriptions
- **Microservices**: Potential extraction of tax calculations or AI services

---

## File Structure Reference

```
firecfo-mvp/
├── app/                          # Next.js App Router
│   ├── auth/callback/route.ts   # OAuth callback handler
│   ├── login/page.tsx           # Login page
│   ├── signup/page.tsx          # Signup page
│   ├── onboarding/              # 5-step wizard
│   │   ├── page.tsx
│   │   ├── components/          # Step 1-5 components
│   │   ├── hooks/               # useAutoSave
│   │   ├── utils/               # FIRE calculations
│   │   └── types.ts             # Zod schemas
│   ├── dashboard/               # Main dashboard
│   │   ├── page.tsx
│   │   ├── components/          # Cards, charts, modals
│   │   ├── settings/page.tsx   # Settings page
│   │   ├── hooks/               # useDashboardData
│   │   ├── utils/               # Dashboard calculations
│   │   └── types.ts             # TypeScript types
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Landing page
│   └── globals.css              # Global styles
├── components/
│   ├── ui/                      # shadcn/ui components
│   └── auth/                    # Auth components
├── lib/
│   ├── supabase.ts              # Supabase client singleton
│   └── utils.ts                 # Utilities
├── middleware.ts                # Auth routing middleware
├── next.config.ts               # Next.js config
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
└── tailwind.config.ts           # Tailwind config
```

---

## Environment Variables

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# Future Integrations
ANTHROPIC_API_KEY=sk-ant-xxx      # Claude AI
RESEND_API_KEY=re_xxxx             # Email notifications
```

---

## Summary

FireCFO MVP is a **full-stack financial planning web application** built with:
- **Modern React 19 + Next.js 16** for the frontend
- **Supabase** as Backend-as-a-Service for database and authentication
- **TypeScript** for type safety across the entire stack
- **Tailwind CSS** for responsive styling
- **OAuth 2.0** for seamless authentication
- **Client-side calculations** for FIRE metrics with database persistence
- **Row-Level Security** for data protection
- **Serverless deployment** on Vercel

The architecture is designed for rapid MVP development while maintaining scalability for future features like AI financial advising, tax optimization, and real-time notifications.

---

**Diagram Created**: 2025-11-20
**Version**: 1.0
**Application**: FireCFO MVP
**Architecture Type**: Monolithic SPA with BaaS
