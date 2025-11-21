'use client'

import Link from "next/link";
import { motion } from "framer-motion";
import { Flame, TrendingUp, Target, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { LandingNav } from "@/components/ui/landing-nav";

export default function Home() {
  return (
    <AnimatedBackground variant="landing">
      <LandingNav />
      <div className="flex min-h-screen flex-col items-center justify-center p-4 pt-20">
        <main className="flex flex-col items-center justify-center text-center space-y-8 max-w-6xl mx-auto px-4 py-12">
          {/* Logo & Brand */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-4"
          >
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg">
              <Flame className="w-8 h-8 text-white" />
            </div>
            <span className="text-3xl font-bold text-white">FireCFO</span>
          </motion.div>

          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
              India's First AI CFO for
              <br />
              <span className="text-gradient-hero">Financial Independence</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Plan your early retirement with confidence. AI-powered CFO calculates your FIRE number, tracks progress automatically, and coaches you 24/7.
            </p>
          </motion.div>

          {/* CTA Buttons - Above the fold */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="btn-gradient text-white text-lg px-10 py-7 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group"
                >
                  Start Your FIRE Journey
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-10 py-7 rounded-xl border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50 hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                >
                  Log In
                </Button>
              </Link>
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Free forever • No credit card required • Setup in 2 minutes
            </p>
          </motion.div>

          {/* Feature Cards */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-8"
          >
            {/* FIRE Calculator */}
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="group p-8 glass-card rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-white/10"
            >
              <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 mb-4 group-hover:from-emerald-400/30 group-hover:to-emerald-600/30 transition-all">
                <Target className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                FIRE Calculator
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Calculate your exact FIRE number using Indian inflation, realistic returns, and dynamic withdrawal rates based on your timeline.
              </p>
            </motion.div>

            {/* What-If Scenario Engine */}
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="group p-8 glass-card rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-white/10"
            >
              <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 mb-4 group-hover:from-emerald-400/30 group-hover:to-emerald-600/30 transition-all">
                <TrendingUp className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                What-If Scenario Engine
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Test your FIRE strategy risk-free. Instantly see how saving ₹10K more, retiring at 50 vs 45, or lifestyle changes impact your retirement—powered by AI calculations.
              </p>
            </motion.div>

            {/* 24/7 Financial Advisor */}
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="group p-8 glass-card rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-white/10"
            >
              <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-violet-400/20 to-violet-600/20 mb-4 group-hover:from-violet-400/30 group-hover:to-violet-600/30 transition-all">
                <Sparkles className="w-8 h-8 text-violet-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                24/7 Financial Advisor
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Get expert answers to all your FIRE questions. Ask about asset allocation, tax optimization, expense management—your AI CFO is always available.
              </p>
            </motion.div>
          </motion.div>
        </main>
      </div>
    </AnimatedBackground>
  );
}
