/**
 * Dashboard Page
 * Main FIRE Dashboard route with authentication checks
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { DashboardOverview } from './components/dashboard-overview';
import { FloatingChatButton } from './components/chat/floating-chat-button';
import { LogOut, Settings, TrendingUp } from 'lucide-react';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

// Helper function to extract display name from email
const getDisplayNameFromEmail = (email: string): string => {
  const username = email.split('@')[0];
  // Remove numbers and special characters, replace dots/underscores with spaces
  const cleaned = username.replace(/[0-9_.-]/g, ' ').trim();
  // Capitalize first letter of first word
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Prevent duplicate checks
    if (hasChecked) return;

    const checkUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          router.push('/login');
          return;
        }

        // Check if user has completed onboarding
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single();

        // If profile fetch fails or doesn't exist, redirect to onboarding
        if (error || !profile) {
          console.log('No profile found or error, redirecting to onboarding');
          setLoading(false);
          router.push('/onboarding?step=1');
          return;
        }

        // If onboarding not completed, redirect to onboarding
        if (!profile.onboarding_completed) {
          console.log('Onboarding not completed, redirecting to onboarding');
          setLoading(false);
          router.push('/onboarding?step=1');
          return;
        }

        // All checks passed - user can access dashboard
        setUser(user);
        setUserName(
          user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            (user.email ? getDisplayNameFromEmail(user.email) : null)
        );
        setUserEmail(user.email || '');
        setLoading(false);
        setHasChecked(true);
      } catch (error: unknown) {
        console.error('Error checking user:', error);
        setLoading(false);
        router.push('/login');
      }
    };

    checkUser();
  }, [router, hasChecked]);

  // Listen for auth changes separately
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_: AuthChangeEvent, session: Session | null) => {
      if (!session) {
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (error: unknown) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
        <p className="text-lg text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              Welcome back{userName ? `, ${userName.split(' ')[0]}` : ''}!
            </h1>
            {userEmail && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">{userEmail}</p>
            )}
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
              Track your progress toward financial independence
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/assets')}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Asset Hub
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </Button>
          </div>
        </div>

        {/* Dashboard Content */}
        <DashboardOverview />
      </div>

      {/* Floating AI Chat Button */}
      <FloatingChatButton />
    </div>
  );
}
