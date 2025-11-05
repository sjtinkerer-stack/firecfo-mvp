'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, Lock, Flame, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { PasswordStrength } from '@/components/ui/password-strength'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AnimatedBackground } from '@/components/ui/animated-background'
import { AuthBenefits } from '@/components/auth/auth-benefits'

export default function SignUpPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; terms?: string }>({})
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)

  const validateForm = () => {
    const errors: { email?: string; password?: string; confirmPassword?: string; terms?: string } = {}

    if (!email) {
      errors.email = 'Email is required'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        errors.email = 'Please enter a valid email address'
      }
    }

    if (!password) {
      errors.password = 'Password is required'
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long'
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    if (!agreeToTerms) {
      errors.terms = 'You must agree to the terms and conditions'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      if (data.user) {
        // Create profile for new user if it doesn't exist
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', data.user.id)
          .single()

        if (!existingProfile) {
          await supabase
            .from('user_profiles')
            .insert({
              id: data.user.id,
              onboarding_completed: false,
            })
        }

        // Success - redirect to onboarding for new users
        router.push('/onboarding?step=1')
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred during sign up')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthSignUp = async (provider: 'google' | 'linkedin_oidc') => {
    setError('')
    setFieldErrors({})
    setOauthLoading(provider)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
      // Don't reset oauthLoading here as user is being redirected
    } catch (error: any) {
      setError(error.message || 'An error occurred during sign up')
      setOauthLoading(null)
    }
  }

  return (
    <AnimatedBackground variant="auth">
      <div className="flex min-h-screen">
        {/* Left side - Signup form */}
        <div className="flex flex-1 items-center justify-center p-4 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md"
          >
            {/* Logo */}
            <Link href="/" className="flex items-center justify-center gap-2 mb-8">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">FireCFO</span>
            </Link>

            <Card className="glass-card border border-white/20 shadow-2xl">
              <CardHeader className="space-y-1">
                <CardTitle className="text-3xl font-bold text-center">Create free account</CardTitle>
                <CardDescription className="text-center text-base">
                  Start your journey to Financial Independence
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/50 rounded-md"
                  >
                    {error}
                  </motion.div>
                )}

                {/* PRIMARY CTAs - OAuth Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={() => handleOAuthSignUp('google')}
                    disabled={loading || oauthLoading !== null}
                    className="w-full h-11 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm font-medium hover:scale-105 transition-transform"
                  >
                    {oauthLoading === 'google' ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Continue with Google
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => handleOAuthSignUp('linkedin_oidc')}
                    disabled={loading || oauthLoading !== null}
                    className="w-full h-11 text-white font-medium shadow-sm hover:bg-[#094c91] hover:scale-105 transition-transform"
                    style={{ backgroundColor: '#0A66C2' }}
                  >
                    {oauthLoading === 'linkedin_oidc' ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <svg className="h-5 w-5 mr-2" fill="white" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        Continue with LinkedIn
                      </>
                    )}
                  </Button>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-300 dark:border-gray-700" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-gray-900 px-2 text-muted-foreground">
                      Or sign up with email
                    </span>
                  </div>
                </div>

                {/* SECONDARY - Email/Password Form */}
                <form onSubmit={handleEmailSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          if (fieldErrors.email) {
                            setFieldErrors({ ...fieldErrors, email: undefined })
                          }
                        }}
                        disabled={loading || oauthLoading !== null}
                        className="pl-10"
                        aria-invalid={!!fieldErrors.email}
                      />
                    </div>
                    {fieldErrors.email && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-600 dark:text-red-400"
                      >
                        {fieldErrors.email}
                      </motion.p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                      <PasswordInput
                        id="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          if (fieldErrors.password) {
                            setFieldErrors({ ...fieldErrors, password: undefined })
                          }
                        }}
                        disabled={loading || oauthLoading !== null}
                        className="pl-10"
                        aria-invalid={!!fieldErrors.password}
                      />
                    </div>
                    {fieldErrors.password && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-600 dark:text-red-400"
                      >
                        {fieldErrors.password}
                      </motion.p>
                    )}
                    <PasswordStrength password={password} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                      <PasswordInput
                        id="confirmPassword"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value)
                          if (fieldErrors.confirmPassword) {
                            setFieldErrors({ ...fieldErrors, confirmPassword: undefined })
                          }
                        }}
                        disabled={loading || oauthLoading !== null}
                        className="pl-10"
                        aria-invalid={!!fieldErrors.confirmPassword}
                      />
                    </div>
                    {fieldErrors.confirmPassword && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-600 dark:text-red-400"
                      >
                        {fieldErrors.confirmPassword}
                      </motion.p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={agreeToTerms}
                        onChange={(e) => {
                          setAgreeToTerms(e.target.checked)
                          if (fieldErrors.terms) {
                            setFieldErrors({ ...fieldErrors, terms: undefined })
                          }
                        }}
                        className="h-4 w-4 mt-1 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor="terms" className="text-sm text-muted-foreground">
                        I agree to the{' '}
                        <Link href="/terms" className="text-primary hover:underline">
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="text-primary hover:underline">
                          Privacy Policy
                        </Link>
                      </label>
                    </div>
                    {fieldErrors.terms && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-600 dark:text-red-400"
                      >
                        {fieldErrors.terms}
                      </motion.p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full btn-gradient text-white h-11"
                    disabled={loading || oauthLoading !== null}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </CardContent>
              <CardFooter>
                <p className="text-sm text-center w-full text-muted-foreground">
                  Already have an account?{' '}
                  <Link href="/login" className="text-primary hover:underline font-medium">
                    Log in
                  </Link>
                </p>
              </CardFooter>
            </Card>

            {/* Security badge */}
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-6">
              🔒 Your data is encrypted and secure
            </p>
          </motion.div>
        </div>

        {/* Right side - Benefits (Desktop only) */}
        <AuthBenefits variant="signup" />
      </div>
    </AnimatedBackground>
  )
}
