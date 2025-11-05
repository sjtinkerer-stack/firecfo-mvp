'use client'

import Link from 'next/link'
import { Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, useScroll } from 'framer-motion'
import { useState, useEffect } from 'react'

export function LandingNav() {
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const { scrollY } = useScroll()

  useEffect(() => {
    return scrollY.on('change', (latest) => {
      if (latest < 100) {
        // Always show at top
        setIsVisible(true)
      } else if (latest < lastScrollY) {
        // Scrolling up
        setIsVisible(true)
      } else if (latest > lastScrollY && latest > 100) {
        // Scrolling down
        setIsVisible(false)
      }
      setLastScrollY(latest)
    })
  }, [scrollY, lastScrollY])

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: isVisible ? 0 : -100 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">FireCFO</span>
          </Link>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 hidden sm:inline-flex"
              >
                Log In
              </Button>
            </Link>
            <Link href="/signup">
              <Button
                size="sm"
                className="btn-gradient text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all"
              >
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  )
}
