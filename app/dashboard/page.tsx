'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    // Prevent duplicate checks
    if (hasChecked) return

    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setLoading(false)
          router.push('/login')
          return
        }

        // Check if user has completed onboarding
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single()

        // If profile fetch fails or doesn't exist, redirect to onboarding
        if (error || !profile) {
          console.log('No profile found or error, redirecting to onboarding')
          setLoading(false)
          router.push('/onboarding?step=1')
          return
        }

        // If onboarding not completed, redirect to onboarding
        if (!profile.onboarding_completed) {
          console.log('Onboarding not completed, redirecting to onboarding')
          setLoading(false)
          router.push('/onboarding?step=1')
          return
        }

        // All checks passed - user can access dashboard
        setUser(user)
        setLoading(false)
        setHasChecked(true)
      } catch (error: unknown) {
        console.error('Error checking user:', error)
        setLoading(false)
        router.push('/login')
      }
    }

    checkUser()
  }, [router, hasChecked])

  // Listen for auth changes separately
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_: AuthChangeEvent, session: Session | null) => {
      if (!session) {
        router.push('/login')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/')
    } catch (error: unknown) {
      console.error('Error logging out:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pt-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">FireCFO Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, {user?.email}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Log Out
          </Button>
        </div>

        {/* Welcome Card */}
        <Card className="mb-8 bg-gradient-to-r from-green-500 to-blue-500 text-white border-0">
          <CardHeader>
            <CardTitle className="text-white">Welcome to Your FIRE Journey!</CardTitle>
            <CardDescription className="text-green-50">
              You've successfully set up your account. Let's start building your path to financial independence.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Net Worth</CardTitle>
              <CardDescription>Your total assets</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">₹0</p>
              <p className="text-sm text-gray-500 mt-2">Add your assets to get started</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">FIRE Progress</CardTitle>
              <CardDescription>Journey to independence</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">0%</p>
              <p className="text-sm text-gray-500 mt-2">Complete onboarding to calculate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Target Corpus</CardTitle>
              <CardDescription>Your FIRE goal</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">₹0</p>
              <p className="text-sm text-gray-500 mt-2">Set your goals in onboarding</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with these essential steps</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button className="h-20 text-left justify-start" variant="outline">
              <div>
                <div className="font-semibold">Complete Onboarding</div>
                <div className="text-sm text-gray-500">Set up your financial profile</div>
              </div>
            </Button>

            <Button className="h-20 text-left justify-start" variant="outline">
              <div>
                <div className="font-semibold">Add Assets</div>
                <div className="text-sm text-gray-500">Track your investments</div>
              </div>
            </Button>

            <Button className="h-20 text-left justify-start" variant="outline">
              <div>
                <div className="font-semibold">Talk to AI Advisor</div>
                <div className="text-sm text-gray-500">Get personalized guidance</div>
              </div>
            </Button>

            <Button className="h-20 text-left justify-start" variant="outline">
              <div>
                <div className="font-semibold">Calculate Taxes</div>
                <div className="text-sm text-gray-500">Optimize your tax savings</div>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* User Info Card */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">User ID:</span>
                <span className="font-mono text-xs">{user?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Account created:</span>
                <span className="font-medium">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
