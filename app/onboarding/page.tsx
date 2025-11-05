import { Suspense } from 'react'
import { OnboardingWizard } from './components/onboarding-wizard'

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <OnboardingWizard />
    </Suspense>
  )
}
