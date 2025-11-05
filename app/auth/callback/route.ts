import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  // If no code parameter, redirect to login
  if (!code) {
    return NextResponse.redirect(new URL('/login', requestUrl.origin))
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  try {
    // Exchange code for session
    const { error: authError } = await supabase.auth.exchangeCodeForSession(code)

    if (authError) {
      console.error('Error exchanging code for session:', authError)
      return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
    }

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('Error getting user:', userError)
      return NextResponse.redirect(new URL('/login?error=user_not_found', requestUrl.origin))
    }

    // Check if user profile exists
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single()

    // If profile doesn't exist, create it (new user)
    if (profileError && profileError.code === 'PGRST116') {
      console.log('Creating new profile for user:', user.id)
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          onboarding_completed: false,
        })

      if (insertError) {
        console.error('Error creating profile:', insertError)
      }

      // New user - always go to onboarding
      return NextResponse.redirect(new URL('/onboarding?step=1', requestUrl.origin))
    }

    // If there's any other profile error, redirect to onboarding as fail-safe
    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.redirect(new URL('/onboarding?step=1', requestUrl.origin))
    }

    // If onboarding not completed, redirect to onboarding
    if (!profile?.onboarding_completed) {
      return NextResponse.redirect(new URL('/onboarding?step=1', requestUrl.origin))
    }

    // Only redirect to dashboard if we're certain onboarding is completed
    return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))

  } catch (error) {
    console.error('Unexpected error in auth callback:', error)
    // On unexpected errors, redirect to login
    return NextResponse.redirect(new URL('/login?error=unexpected', requestUrl.origin))
  }
}
