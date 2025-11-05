'use client'

import Link from "next/link";
import { motion } from "framer-motion";
import { Flame, TrendingUp, Bot, Receipt, ArrowRight } from "lucide-react";
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
              Your AI CFO for
              <br />
              <span className="text-gradient-hero">Financial Freedom</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Take control of your financial future with personalized FIRE planning,
              AI-powered insights, and smart tracking tools designed for Indians.
            </p>
            <p className="text-sm text-emerald-400 font-medium">
              Built for Indians earning ₹15L-50L annually
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
            {/* Track Net Worth */}
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="group p-8 glass-card rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-white/10"
            >
              <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 mb-4 group-hover:from-emerald-400/30 group-hover:to-emerald-600/30 transition-all">
                <TrendingUp className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Track Net Worth
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Monitor your assets and watch your wealth grow over time with real-time insights
              </p>
            </motion.div>

            {/* AI Advisor */}
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="group p-8 glass-card rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-white/10"
            >
              <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-purple-400/20 to-purple-600/20 mb-4 group-hover:from-purple-400/30 group-hover:to-purple-600/30 transition-all">
                <Bot className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                AI Advisor
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Get personalized financial guidance powered by Claude AI, available 24/7
              </p>
            </motion.div>

            {/* Tax Optimization */}
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="group p-8 glass-card rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-white/10"
            >
              <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-blue-400/20 to-blue-600/20 mb-4 group-hover:from-blue-400/30 group-hover:to-blue-600/30 transition-all">
                <Receipt className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Tax Optimization
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Maximize your savings with intelligent Indian tax regime calculations
              </p>
            </motion.div>
          </motion.div>
        </main>
      </div>
    </AnimatedBackground>
  );
}
