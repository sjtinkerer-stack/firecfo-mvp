import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface AutoSaveOptions {
  delay?: number // Debounce delay in milliseconds
  onSave?: () => void
  onError?: (error: Error) => void
}

interface AutoSaveReturn {
  isSaving: boolean
  lastSaved: Date | null
  error: Error | null
  saveNow: () => Promise<void>
}

export function useAutoSave(
  data: Record<string, any>,
  enabled = true,
  options: AutoSaveOptions = {}
): AutoSaveReturn {
  const { delay = 500, onSave, onError } = options
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previousDataRef = useRef<string>('')

  const saveToDatabase = useCallback(async () => {
    if (!enabled) return

    setIsSaving(true)
    setError(null)

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('User not authenticated')
      }

      // Filter out undefined, null, and empty string values
      // Keep 0 values for numeric fields (spouse_income, dependents are valid as 0)
      const cleanedData = Object.entries(data).reduce((acc, [key, value]) => {
        // Skip undefined, null, or empty string values
        if (value === undefined || value === null || value === '') {
          return acc
        }
        // Never overwrite onboarding_completed via auto-save
        if (key === 'onboarding_completed') {
          return acc
        }
        // Keep all other values (including 0 for numbers)
        acc[key] = value
        return acc
      }, {} as Record<string, any>)

      // Only proceed if there's at least one field to save
      if (Object.keys(cleanedData).length === 0) {
        setIsSaving(false)
        return
      }

      // Upsert user profile data
      const { error: saveError } = await supabase
        .from('user_profiles')
        .upsert(
          {
            id: user.id,
            ...cleanedData,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'id',
          }
        )

      if (saveError) {
        // Enhance error message with more details
        const enhancedError = new Error(
          `Database save failed: ${saveError.message} (Code: ${saveError.code || 'unknown'})`
        )
        throw enhancedError
      }

      setLastSaved(new Date())
      onSave?.()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save')
      setError(error)
      onError?.(error)
      // Log detailed error information
      console.error('Auto-save error:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        originalError: err,
      })
    } finally {
      setIsSaving(false)
    }
  }, [data, enabled, onSave, onError])

  // Debounced auto-save
  useEffect(() => {
    if (!enabled) return

    // Check if data has changed
    const currentData = JSON.stringify(data)
    if (currentData === previousDataRef.current) return

    previousDataRef.current = currentData

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      saveToDatabase()
    }, delay)

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [data, delay, enabled, saveToDatabase])

  // Manual save function
  const saveNow = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    await saveToDatabase()
  }, [saveToDatabase])

  return {
    isSaving,
    lastSaved,
    error,
    saveNow,
  }
}
