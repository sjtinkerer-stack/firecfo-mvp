import { z } from 'zod'

// Step 1: Personal Information Schema
export const step1Schema = z.object({
  age: z.number().min(18, 'Age must be at least 18').max(65, 'Age must be at most 65'),
  city: z.string().min(1, 'Please select a city'),
  marital_status: z.enum(['Single', 'Married'], {
    message: 'Please select your marital status',
  }),
  dependents: z.number().min(0, 'Dependents cannot be negative').max(10, 'Dependents cannot exceed 10'),
})

// Step 2: Monthly Income Schema
export const step2Schema = z.object({
  monthly_income: z
    .number()
    .min(10000, 'Income must be at least ₹10,000')
    .max(5000000, 'Income cannot exceed ₹50,00,000'),
  spouse_income: z.number().min(0, 'Spouse income cannot be negative').max(5000000, 'Income cannot exceed ₹50,00,000').optional(),
})

// Step 3: Monthly Expenses Schema
export const step3Schema = z.object({
  monthly_expenses: z
    .number()
    .min(5000, 'Expenses must be at least ₹5,000')
    .max(10000000, 'Expenses cannot exceed ₹1,00,00,000'),
})

// Step 4: Net Worth Schema (all fields optional)
export const step4Schema = z.object({
  equity: z.number().min(0, 'Equity cannot be negative').default(0).optional(),
  debt: z.number().min(0, 'Debt cannot be negative').default(0).optional(),
  cash: z.number().min(0, 'Cash cannot be negative').default(0).optional(),
  real_estate: z.number().min(0, 'Real estate cannot be negative').default(0).optional(),
  other_assets: z.number().min(0, 'Other assets cannot be negative').default(0).optional(),
})

// Step 5: FIRE Goal Schema
export const step5Schema = z.object({
  fire_age: z
    .number()
    .min(18, 'FIRE age must be at least 18')
    .max(80, 'FIRE age cannot exceed 80'),
  fire_lifestyle_type: z.enum(['lean', 'standard', 'fat'], {
    message: 'Please select a FIRE lifestyle type',
  }),
})

// Combined schema for all steps (partial since not all steps filled at once)
// Individual step validations will use strict schemas when triggered
export const onboardingSchema = z.object({
  ...step1Schema.partial().shape,
  ...step2Schema.partial().shape,
  ...step3Schema.partial().shape,
  ...step4Schema.partial().shape,
  ...step5Schema.partial().shape,
})

// Type inference
export type Step1Data = z.infer<typeof step1Schema>
export type Step2Data = z.infer<typeof step2Schema>
export type Step3Data = z.infer<typeof step3Schema>
export type Step4Data = z.infer<typeof step4Schema>
export type Step5Data = z.infer<typeof step5Schema>
export type OnboardingData = z.infer<typeof onboardingSchema>

// FIRE Lifestyle Types
export type FireLifestyleType = 'lean' | 'standard' | 'fat'

// Indian cities list
export const INDIAN_CITIES = [
  // North
  'Delhi',
  'Noida',
  'Gurgaon',
  'Ghaziabad',
  'Chandigarh',
  'Jaipur',
  'Lucknow',
  // South
  'Bangalore',
  'Chennai',
  'Hyderabad',
  'Kochi',
  'Coimbatore',
  'Visakhapatnam',
  // West
  'Mumbai',
  'Pune',
  'Ahmedabad',
  'Surat',
  'Nagpur',
  // East
  'Kolkata',
  'Bhubaneswar',
  'Patna',
  'Other',
] as const
