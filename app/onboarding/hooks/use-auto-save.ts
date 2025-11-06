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
  const dataRef = useRef(data) // Store latest data in ref

  // Update data ref whenever data changes
  useEffect(() => {
    dataRef.current = data
  }, [data])

  const saveToDatabase = useCallback(async () => {
    if (!enabled) return

    setIsSaving(true)
    setError(null)

    try {
      // Use data from ref instead of closure
      const currentData = dataRef.current
      // DEBUG: Log raw data received
      console.log('🔍 DEBUG [Auto-save]: Raw data received:', currentData)

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('User not authenticated')
      }

      // Filter out undefined, null, and empty string values
      // Keep 0 values for numeric fields (spouse_income, dependents are valid as 0)
      const cleanedData = Object.entries(currentData).reduce((acc, [key, value]) => {
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

      // DEBUG: Log cleaned data
      console.log('🔍 DEBUG [Auto-save]: Cleaned data after filtering:', cleanedData)

      // Only proceed if there's at least one field to save
      if (Object.keys(cleanedData).length === 0) {
        setIsSaving(false)
        return
      }

      // Prepare data for upsert
      const upsertData = {
        id: user.id,
        ...cleanedData,
        updated_at: new Date().toISOString(),
      }

      // DEBUG: Log what we're sending
      console.log('🔍 DEBUG: Attempting upsert with data:', upsertData)

      // Upsert user profile data
      const { data: upsertResult, error: saveError } = await supabase
        .from('user_profiles')
        .upsert(upsertData, {
          onConflict: 'id',
        })
        .select()

      // DEBUG: Log the result
      console.log('🔍 DEBUG: Upsert result:', { data: upsertResult, error: saveError })

      if (saveError) {
        // Enhance error message with more details
        const enhancedError = new Error(
          `Database save failed: ${saveError.message} (Code: ${saveError.code || 'unknown'})`
        )
        throw enhancedError
      }

      // DEBUG: Verify the data was actually saved by fetching it back
      const { data: verifyData, error: verifyError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      console.log('🔍 DEBUG: Verification query result:', { data: verifyData, error: verifyError })

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
  }, [enabled, onSave, onError]) // Removed 'data' from dependencies - using dataRef instead

  // Debounced auto-save
  useEffect(() => {
    console.log('🔍 DEBUG [Auto-save useEffect]: Triggered', { enabled, data })

    if (!enabled) {
      console.log('🔍 DEBUG [Auto-save useEffect]: Skipped - not enabled')
      return
    }

    // Check if data has changed
    const currentData = JSON.stringify(data)
    const previousData = previousDataRef.current

    console.log('🔍 DEBUG [Auto-save useEffect]: Data comparison', {
      currentData,
      previousData,
      areSame: currentData === previousData
    })

    if (currentData === previousDataRef.current) {
      console.log('🔍 DEBUG [Auto-save useEffect]: Skipped - data unchanged')
      return
    }

    previousDataRef.current = currentData
    console.log('🔍 DEBUG [Auto-save useEffect]: Data changed! Scheduling save in', delay, 'ms')

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      console.log('🔍 DEBUG [Auto-save useEffect]: Timeout completed, calling saveToDatabase')
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
