'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

interface PasswordStrengthProps {
  password: string
}

type StrengthLevel = 'weak' | 'medium' | 'strong'

interface StrengthData {
  level: StrengthLevel
  label: string
  color: string
  width: string
}

function calculatePasswordStrength(password: string): StrengthData {
  if (!password) {
    return {
      level: 'weak',
      label: '',
      color: 'bg-gray-200',
      width: 'w-0'
    }
  }

  let strength = 0

  // Length check
  if (password.length >= 8) strength++
  if (password.length >= 12) strength++

  // Character variety checks
  if (/[a-z]/.test(password)) strength++
  if (/[A-Z]/.test(password)) strength++
  if (/[0-9]/.test(password)) strength++
  if (/[^a-zA-Z0-9]/.test(password)) strength++

  // Determine strength level
  if (strength <= 2) {
    return {
      level: 'weak',
      label: 'Weak',
      color: 'bg-red-500',
      width: 'w-1/3'
    }
  } else if (strength <= 4) {
    return {
      level: 'medium',
      label: 'Medium',
      color: 'bg-yellow-500',
      width: 'w-2/3'
    }
  } else {
    return {
      level: 'strong',
      label: 'Strong',
      color: 'bg-green-500',
      width: 'w-full'
    }
  }
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = calculatePasswordStrength(password)

  if (!password) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300 ease-out",
              strength.color,
              strength.width
            )}
          />
        </div>
        <span
          className={cn(
            "text-xs font-medium",
            strength.level === 'weak' && "text-red-600 dark:text-red-400",
            strength.level === 'medium' && "text-yellow-600 dark:text-yellow-400",
            strength.level === 'strong' && "text-green-600 dark:text-green-400"
          )}
        >
          {strength.label}
        </span>
      </div>
      {strength.level !== 'strong' && (
        <p className="text-xs text-muted-foreground">
          {strength.level === 'weak' && "Use 8+ characters with a mix of letters, numbers & symbols"}
          {strength.level === 'medium' && "Add more variety to make it stronger"}
        </p>
      )}
    </div>
  )
}
