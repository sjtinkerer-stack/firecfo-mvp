'use client'

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { TrendingUp, Shield, Zap, Target } from "lucide-react"

interface Benefit {
  icon: React.ReactNode
  title: string
  description: string
}

interface AuthBenefitsProps {
  variant: 'login' | 'signup'
}

const loginBenefits: Benefit[] = [
  {
    icon: <TrendingUp className="w-8 h-8 text-emerald-400" />,
    title: "Track Your FIRE Progress",
    description: "Monitor your journey to financial independence with real-time insights and AI-powered recommendations."
  },
  {
    icon: <Shield className="w-8 h-8 text-purple-400" />,
    title: "Bank-Level Security",
    description: "Your financial data is encrypted and secure. We never share your information with third parties."
  },
  {
    icon: <Zap className="w-8 h-8 text-blue-400" />,
    title: "Smart Tax Optimization",
    description: "Save lakhs in taxes with our AI advisor that understands Indian tax regimes inside out."
  }
]

const signupBenefits: Benefit[] = [
  {
    icon: <Target className="w-8 h-8 text-emerald-400" />,
    title: "Set Your FIRE Goal",
    description: "Define your financial independence target and get a personalized roadmap to achieve it faster."
  },
  {
    icon: <TrendingUp className="w-8 h-8 text-purple-400" />,
    title: "Join 10,000+ Indians",
    description: "Be part of a growing community that's building wealth and achieving FIRE together."
  },
  {
    icon: <Zap className="w-8 h-8 text-blue-400" />,
    title: "Get Started in 2 Minutes",
    description: "Quick setup, no credit card required. Start tracking your net worth and get AI insights immediately."
  }
]

export function AuthBenefits({ variant }: AuthBenefitsProps) {
  const benefits = variant === 'login' ? loginBenefits : signupBenefits
  const [currentIndex, setCurrentIndex] = React.useState(0)

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % benefits.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [benefits.length])

  return (
    <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-12 xl:px-16">
      <div className="space-y-8">
        {/* Main rotating benefit */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="inline-flex p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              {benefits[currentIndex].icon}
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-white">
                {benefits[currentIndex].title}
              </h3>
              <p className="text-lg text-gray-300 leading-relaxed">
                {benefits[currentIndex].description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Pagination dots */}
        <div className="flex gap-2">
          {benefits.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'w-8 bg-emerald-400'
                  : 'w-1.5 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to benefit ${index + 1}`}
            />
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10">
          <div>
            <div className="text-3xl font-bold text-white">10K+</div>
            <div className="text-sm text-gray-400 mt-1">Active Users</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">₹2.5Cr</div>
            <div className="text-sm text-gray-400 mt-1">Avg Saved</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">4.9★</div>
            <div className="text-sm text-gray-400 mt-1">User Rating</div>
          </div>
        </div>

        {/* Testimonial quote */}
        <div className="pt-8">
          <div className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
            <p className="text-gray-300 italic mb-4">
              "FireCFO helped me reach FIRE 5 years earlier than planned. The AI advisor is like having a personal CFO!"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-purple-400 flex items-center justify-center text-white font-bold">
                R
              </div>
              <div>
                <div className="text-white font-medium">Rahul Sharma</div>
                <div className="text-gray-400 text-sm">Software Engineer, Bangalore</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
