'use client'

import * as React from "react"
import { motion } from "framer-motion"

interface AnimatedBackgroundProps {
  children: React.ReactNode
  variant?: 'landing' | 'auth'
}

export function AnimatedBackground({ children, variant = 'landing' }: AnimatedBackgroundProps) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated gradient background */}
      <div className="animated-gradient absolute inset-0" />

      {/* Grid pattern overlay */}
      <div className="grid-pattern absolute inset-0 opacity-20" />

      {/* Floating decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large circle - top right */}
        <motion.div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Medium circle - bottom left */}
        <motion.div
          className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />

        {/* Small circle - middle */}
        {variant === 'landing' && (
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl"
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.2, 0.3, 0.2],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
          />
        )}

        {/* Floating geometric shapes */}
        <motion.div
          className="absolute top-1/4 right-1/4 w-20 h-20 border-2 border-emerald-400/20 rotate-45"
          animate={{
            y: [0, -30, 0],
            rotate: [45, 65, 45],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="absolute bottom-1/4 left-1/3 w-16 h-16 border-2 border-purple-400/20 rounded-full"
          animate={{
            y: [0, 30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
