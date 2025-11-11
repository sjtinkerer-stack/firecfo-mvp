import { z } from 'zod'

// Helper function to validate birth year results in valid age (18-65)
const currentYear = new Date().getFullYear()
const minBirthYear = currentYear - 65 // Max age 65
const maxBirthYear = currentYear - 18 // Min age 18

// Step 1: Personal Information Schema
export const step1Schema = z.object({
  birth_year: z
    .number()
    .min(minBirthYear, `Birth year must be ${minBirthYear} or later (age 65 or younger)`)
    .max(maxBirthYear, `Birth year must be ${maxBirthYear} or earlier (age 18 or older)`),
  birth_month: z
    .number()
    .min(1, 'Birth month must be between 1 and 12')
    .max(12, 'Birth month must be between 1 and 12'),
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
  fire_target_age: z
    .number()
    .min(18, 'FIRE age must be at least 18')
    .max(80, 'FIRE age cannot exceed 80'),
  fire_lifestyle_type: z.enum(['lean', 'standard', 'fat'], {
    message: 'Please select a FIRE lifestyle type',
  }),
  // fire_target_date is computed from birth_year/birth_month + fire_target_age
  // It's included in the form data but not validated here
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

// Month names for birth month picker
export const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
] as const
