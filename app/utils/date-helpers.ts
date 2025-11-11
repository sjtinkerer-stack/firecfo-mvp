/**
 * Date Helper Utilities
 * Functions for age calculation, date formatting, and FIRE countdown
 */

import { differenceInYears, differenceInMonths, differenceInDays, addYears, format, parseISO } from 'date-fns';

/**
 * Calculate current age from date of birth
 * @param dateOfBirth - Date of birth (Date object or ISO string)
 * @returns Current age in years
 */
export function calculateAge(dateOfBirth: Date | string): number {
  const dob = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : dateOfBirth;
  const today = new Date();
  return differenceInYears(today, dob);
}

/**
 * Calculate FIRE target date from date of birth and target age
 * @param dateOfBirth - Date of birth (Date object or ISO string)
 * @param targetAge - Desired FIRE age
 * @returns FIRE target date
 */
export function calculateFireTargetDate(dateOfBirth: Date | string, targetAge: number): Date {
  const dob = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : dateOfBirth;
  return addYears(dob, targetAge);
}

/**
 * Calculate years to FIRE from current date to target date
 * @param fireTargetDate - FIRE target date (Date object or ISO string)
 * @returns Years remaining until FIRE
 */
export function calculateYearsToFire(fireTargetDate: Date | string): number {
  const targetDate = typeof fireTargetDate === 'string' ? parseISO(fireTargetDate) : fireTargetDate;
  const today = new Date();
  return Math.max(0, differenceInYears(targetDate, today));
}

/**
 * Calculate detailed countdown to FIRE (years, months, days)
 * @param fireTargetDate - FIRE target date (Date object or ISO string)
 * @returns Object with years, months, and days remaining
 */
export function calculateFireCountdown(fireTargetDate: Date | string): {
  years: number;
  months: number;
  days: number;
  totalDays: number;
} {
  const targetDate = typeof fireTargetDate === 'string' ? parseISO(fireTargetDate) : fireTargetDate;
  const today = new Date();

  if (targetDate <= today) {
    return { years: 0, months: 0, days: 0, totalDays: 0 };
  }

  const years = differenceInYears(targetDate, today);
  const monthsAfterYears = differenceInMonths(targetDate, addYears(today, years));
  const daysAfterMonths = differenceInDays(
    targetDate,
    addYears(addMonths(today, monthsAfterYears), years)
  );
  const totalDays = differenceInDays(targetDate, today);

  return {
    years,
    months: monthsAfterYears,
    days: Math.max(0, daysAfterMonths),
    totalDays: Math.max(0, totalDays),
  };
}

/**
 * Format date for display (e.g., "June 2037")
 * @param date - Date to format (Date object or ISO string)
 * @returns Formatted date string
 */
export function formatFireTargetDate(date: Date | string): string {
  const targetDate = typeof date === 'string' ? parseISO(date) : date;
  return format(targetDate, 'MMMM yyyy');
}

/**
 * Format date for display with year only (e.g., "2037")
 * @param date - Date to format (Date object or ISO string)
 * @returns Year as string
 */
export function formatFireTargetYear(date: Date | string): string {
  const targetDate = typeof date === 'string' ? parseISO(date) : date;
  return format(targetDate, 'yyyy');
}

/**
 * Get birth year from date of birth
 * @param dateOfBirth - Date of birth (Date object or ISO string)
 * @returns Birth year
 */
export function getBirthYear(dateOfBirth: Date | string): number {
  const dob = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : dateOfBirth;
  return dob.getFullYear();
}

/**
 * Get birth month from date of birth (1-12)
 * @param dateOfBirth - Date of birth (Date object or ISO string)
 * @returns Birth month (1 = January, 12 = December)
 */
export function getBirthMonth(dateOfBirth: Date | string): number {
  const dob = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : dateOfBirth;
  return dob.getMonth() + 1; // getMonth() returns 0-11, we want 1-12
}

/**
 * Create date from birth year and month
 * @param year - Birth year
 * @param month - Birth month (1-12)
 * @returns Date object set to the 1st of the given month
 */
export function createDateFromYearMonth(year: number, month: number): Date {
  // Use 1st of month as default day (conservative approach)
  // This ensures calculated age is never older than actual age
  // Age calculation will be accurate or slightly younger by up to 30 days
  // Use Date.UTC to avoid timezone conversion issues when saving to database
  return new Date(Date.UTC(year, month - 1, 1));
}

/**
 * Validate that date of birth results in age within range
 * @param dateOfBirth - Date of birth to validate
 * @param minAge - Minimum allowed age
 * @param maxAge - Maximum allowed age
 * @returns True if age is within range
 */
export function isAgeInRange(dateOfBirth: Date | string, minAge: number, maxAge: number): boolean {
  const age = calculateAge(dateOfBirth);
  return age >= minAge && age <= maxAge;
}

/**
 * Validate that FIRE target date is after date of birth
 * @param dateOfBirth - Date of birth
 * @param fireTargetDate - FIRE target date
 * @returns True if FIRE date is after birth date
 */
export function isFireDateValid(dateOfBirth: Date | string, fireTargetDate: Date | string): boolean {
  const dob = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : dateOfBirth;
  const fireDate = typeof fireTargetDate === 'string' ? parseISO(fireTargetDate) : fireTargetDate;
  return fireDate > dob;
}

// Helper function for calculateFireCountdown
function addMonths(date: Date, months: number): Date {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + months);
  return newDate;
}
