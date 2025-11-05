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

// Combined schema for all steps (partial since not all steps filled at once)
// Individual step validations will use strict schemas when triggered
export const onboardingSchema = z.object({
  ...step1Schema.partial().shape,
  ...step2Schema.partial().shape,
})

// Type inference
export type Step1Data = z.infer<typeof step1Schema>
export type Step2Data = z.infer<typeof step2Schema>
export type OnboardingData = z.infer<typeof onboardingSchema>

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
