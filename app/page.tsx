import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <main className="flex flex-col items-center justify-center text-center space-y-8 max-w-4xl mx-auto px-4">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            FireCFO
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl">
            Your AI-powered path to Financial Independence Retire Early
          </p>
        </div>

        <div className="space-y-6 max-w-2xl">
          <p className="text-lg text-gray-700">
            Take control of your financial future with personalized FIRE planning,
            AI-powered insights, and smart tracking tools designed specifically for Indians.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="font-semibold text-gray-900 mb-2">Track Net Worth</h3>
              <p className="text-sm text-gray-600">
                Monitor your assets and watch your wealth grow over time
              </p>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="text-3xl mb-3">🤖</div>
              <h3 className="font-semibold text-gray-900 mb-2">AI Advisor</h3>
              <p className="text-sm text-gray-600">
                Get personalized financial guidance powered by Claude AI
              </p>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="text-3xl mb-3">💰</div>
              <h3 className="font-semibold text-gray-900 mb-2">Tax Optimization</h3>
              <p className="text-sm text-gray-600">
                Maximize your savings with Indian tax regime calculations
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8 py-6">
              Get Started
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="text-lg px-8 py-6">
              Log In
            </Button>
          </Link>
        </div>

        <p className="text-sm text-gray-500 mt-8">
          Designed for Indians earning ₹15L-50L annually
        </p>
      </main>
    </div>
  );
}
