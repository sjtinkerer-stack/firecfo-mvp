# FireCFO Component Usage Examples

**Practical copy-paste examples for common UI patterns**

---

## Table of Contents
1. [Forms & Inputs](#forms--inputs)
2. [Metric Cards](#metric-cards)
3. [Modals & Dialogs](#modals--dialogs)
4. [Status Banners](#status-banners)
5. [Charts](#charts)
6. [Navigation](#navigation)
7. [Loading States](#loading-states)
8. [Error Handling](#error-handling)
9. [Empty States](#empty-states)
10. [Chat UI](#chat-ui)

---

## Forms & Inputs

### Basic Form with Validation

```tsx
'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// Validation schema
const formSchema = z.object({
  monthlyIncome: z.number().min(1, 'Income must be greater than 0'),
  monthlyExpenses: z.number().min(1, 'Expenses must be greater than 0'),
});

export function IncomeExpenseForm() {
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate
    const result = formSchema.safeParse({
      monthlyIncome: Number(monthlyIncome),
      monthlyExpenses: Number(monthlyExpenses),
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    // Submit
    setLoading(true);
    try {
      // API call here
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Saved successfully');
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Monthly Income */}
      <div className="space-y-2">
        <Label htmlFor="monthly-income">Monthly Income</Label>
        <Input
          id="monthly-income"
          type="number"
          placeholder="₹0"
          value={monthlyIncome}
          onChange={(e) => setMonthlyIncome(e.target.value)}
          aria-invalid={!!errors.monthlyIncome}
          aria-describedby={errors.monthlyIncome ? "income-error" : undefined}
        />
        {errors.monthlyIncome && (
          <p id="income-error" className="text-sm text-destructive">
            {errors.monthlyIncome}
          </p>
        )}
      </div>

      {/* Monthly Expenses */}
      <div className="space-y-2">
        <Label htmlFor="monthly-expenses">Monthly Expenses</Label>
        <Input
          id="monthly-expenses"
          type="number"
          placeholder="₹0"
          value={monthlyExpenses}
          onChange={(e) => setMonthlyExpenses(e.target.value)}
          aria-invalid={!!errors.monthlyExpenses}
          aria-describedby={errors.monthlyExpenses ? "expenses-error" : undefined}
        />
        {errors.monthlyExpenses && (
          <p id="expenses-error" className="text-sm text-destructive">
            {errors.monthlyExpenses}
          </p>
        )}
      </div>

      {/* Submit */}
      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        {loading ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  );
}
```

### Pill Selector (Radio Button Group)

```tsx
'use client';

import { useState } from 'react';
import { PillSelector } from '@/app/onboarding/components/pill-selector';

export function MaritalStatusSelector() {
  const [maritalStatus, setMaritalStatus] = useState('');

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium">Marital Status</label>
      <PillSelector
        options={[
          { value: 'single', label: 'Single' },
          { value: 'married', label: 'Married' },
        ]}
        value={maritalStatus}
        onChange={setMaritalStatus}
        columns={2}
        size="md"
      />
    </div>
  );
}
```

### Slider with Live Preview

```tsx
'use client';

import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

export function FireAgeSelector() {
  const [fireAge, setFireAge] = useState(45);
  const currentAge = 30;
  const yearsToFire = fireAge - currentAge;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Target FIRE Age</Label>
        <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          {fireAge}
        </span>
      </div>

      <Slider
        min={currentAge + 5}
        max={80}
        step={1}
        value={[fireAge]}
        onValueChange={([value]) => setFireAge(value)}
      />

      <p className="text-sm text-muted-foreground text-center">
        {yearsToFire} years until FIRE
      </p>
    </div>
  );
}
```

---

## Metric Cards

### Net Worth Card with Edit

```tsx
'use client';

import { MetricCard } from '@/app/dashboard/components/metric-card';
import { Wallet } from 'lucide-react';
import { formatFireCurrency } from '@/app/onboarding/utils/fire-calculations';

export function NetWorthCard({ netWorth, onEdit }: { netWorth: number; onEdit: () => void }) {
  return (
    <MetricCard
      title="Net Worth"
      value={formatFireCurrency(netWorth)}
      subtitle="Total assets minus liabilities"
      icon={<Wallet className="h-6 w-6" />}
      colorTheme="blue"
      trend={{
        value: 12.5,
        label: 'vs last month',
        isPositive: true,
      }}
      onEdit={onEdit}
    />
  );
}
```

### Savings Rate Card (No Edit)

```tsx
'use client';

import { MetricCard } from '@/app/dashboard/components/metric-card';
import { PiggyBank } from 'lucide-react';

export function SavingsRateCard({ savingsRate }: { savingsRate: number }) {
  const isGood = savingsRate >= 30;

  return (
    <MetricCard
      title="Savings Rate"
      value={`${savingsRate.toFixed(1)}%`}
      subtitle="Percentage of income saved"
      icon={<PiggyBank className="h-6 w-6" />}
      colorTheme={isGood ? 'emerald' : 'amber'}
      badge={
        <span className={`text-xs font-semibold ${isGood ? 'text-emerald-600' : 'text-amber-600'}`}>
          {isGood ? 'Great job!' : 'Try to save more'}
        </span>
      }
    />
  );
}
```

### Grid of Metric Cards

```tsx
'use client';

import { MetricCard } from '@/app/dashboard/components/metric-card';
import { Wallet, IndianRupee, TrendingDown, PiggyBank, Target } from 'lucide-react';
import { formatFireCurrency } from '@/app/onboarding/utils/fire-calculations';

export function MetricsGrid({ data }: { data: DashboardData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <MetricCard
        title="Net Worth"
        value={formatFireCurrency(data.netWorth)}
        icon={<Wallet className="h-6 w-6" />}
        colorTheme="blue"
        onEdit={() => handleEditAssets()}
      />

      <MetricCard
        title="Monthly Income"
        value={formatFireCurrency(data.monthlyIncome)}
        icon={<IndianRupee className="h-6 w-6" />}
        colorTheme="orange"
        onEdit={() => handleEditIncome()}
      />

      <MetricCard
        title="Monthly Expenses"
        value={formatFireCurrency(data.monthlyExpenses)}
        icon={<TrendingDown className="h-6 w-6" />}
        colorTheme="amber"
        onEdit={() => handleEditExpenses()}
      />

      <MetricCard
        title="Savings Rate"
        value={`${data.savingsRate.toFixed(1)}%`}
        icon={<PiggyBank className="h-6 w-6" />}
        colorTheme="violet"
      />

      <MetricCard
        title="Required Corpus"
        value={formatFireCurrency(data.requiredCorpus)}
        icon={<Target className="h-6 w-6" />}
        colorTheme="emerald"
      />

      <MetricCard
        title="Projected Corpus"
        value={formatFireCurrency(data.projectedCorpus)}
        subtitle={`At age ${data.fireAge}`}
        icon={<Target className="h-6 w-6" />}
        colorTheme="cyan"
      />
    </div>
  );
}
```

---

## Modals & Dialogs

### Edit Income/Expenses Modal

```tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface EditIncomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentIncome: number;
  onSave: (income: number) => Promise<void>;
}

export function EditIncomeModal({ open, onOpenChange, currentIncome, onSave }: EditIncomeModalProps) {
  const [income, setIncome] = useState(currentIncome.toString());
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const incomeNum = Number(income);
    if (incomeNum <= 0) {
      toast.error('Income must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      await onSave(incomeNum);
      toast.success('Income updated successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update income');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Monthly Income</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="income">Monthly Income</Label>
            <Input
              id="income"
              type="number"
              placeholder="₹0"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              autoFocus
            />
          </div>

          {/* Impact Preview */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>New savings rate:</strong> {calculateSavingsRate(Number(income))}%
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Confirmation Dialog (Delete)

```tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
}

export function DeleteConfirmDialog({ open, onOpenChange, title, description, onConfirm }: DeleteConfirmDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      toast.success('Deleted successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-1">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Status Banners

### FIRE Status Banner (On Track)

```tsx
'use client';

import { FireStatusBanner } from '@/app/dashboard/components/fire-status-banner';

export function FireStatusSection({ data }: { data: DashboardData }) {
  return (
    <FireStatusBanner
      isOnTrack={data.isOnTrack}
      fireAge={data.fireAge}
      fireTargetDate={data.fireTargetDate}
      fireLifestyleType={data.fireLifestyleType}
      yearsToFire={data.yearsToFire}
      monthlySavingsNeeded={data.monthlySavingsNeeded}
      currentMonthlySavings={data.currentMonthlySavings}
    />
  );
}
```

### Custom Success Banner

```tsx
'use client';

import { CheckCircle2 } from 'lucide-react';

export function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:border-emerald-700 dark:from-emerald-950 dark:to-emerald-900 p-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-200 dark:bg-emerald-800">
          <CheckCircle2 className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">Success!</h3>
          <p className="text-emerald-700 dark:text-emerald-300">{message}</p>
        </div>
      </div>
    </div>
  );
}
```

---

## Charts

### Net Worth Projection Chart

```tsx
'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function NetWorthProjectionChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Net Worth Projection</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorRequired" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
            <XAxis
              dataKey="age"
              className="text-xs text-gray-600 dark:text-gray-400"
              label={{ value: 'Age', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              className="text-xs text-gray-600 dark:text-gray-400"
              tickFormatter={(value) => `₹${(value / 10000000).toFixed(1)}Cr`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [`₹${(value / 100000).toFixed(1)}L`, '']}
            />
            <Legend />

            <Area
              type="monotone"
              dataKey="projectedCorpus"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#colorProjected)"
              name="Projected Corpus"
            />
            <Area
              type="monotone"
              dataKey="requiredCorpus"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#colorRequired)"
              name="Required Corpus"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

### Asset Allocation Pie Chart

```tsx
'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export function AssetAllocationChart({ data }: { data: AssetAllocation[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `₹${(value / 100000).toFixed(1)}L`} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

---

## Loading States

### Skeleton Card Loader

```tsx
'use client';

export function MetricCardSkeleton() {
  return (
    <div className="rounded-xl border-2 border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 bg-gray-300 dark:bg-gray-700 rounded-lg" />
        <div className="h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded" />
      </div>
      <div className="h-8 w-32 bg-gray-300 dark:bg-gray-700 rounded mb-2" />
      <div className="h-3 w-full bg-gray-300 dark:bg-gray-700 rounded" />
    </div>
  );
}

export function MetricsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>
  );
}
```

### Inline Spinner

```tsx
'use client';

import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8">
      <Loader2 className="h-5 w-5 animate-spin text-emerald-600 dark:text-emerald-400" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
```

---

## Error Handling

### Error Banner

```tsx
'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ErrorBanner({ error, retry }: { error: string; retry?: () => void }) {
  return (
    <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-destructive">Error</p>
          <p className="text-sm text-destructive/80 mt-1">{error}</p>
          {retry && (
            <Button variant="outline" size="sm" onClick={retry} className="mt-3">
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Inline Error Message

```tsx
'use client';

export function InlineError({ message }: { message: string }) {
  return (
    <p className="text-sm text-destructive flex items-center gap-1.5">
      <span className="inline-block w-1 h-1 rounded-full bg-destructive" />
      {message}
    </p>
  );
}
```

---

## Empty States

### Generic Empty State

```tsx
'use client';

import { Plus, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EmptyState({
  icon: Icon = FileQuestion,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>
          <Plus className="h-4 w-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
```

### No Conversations Empty State

```tsx
'use client';

import { MessageCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NoConversationsEmpty({ onStartChat }: { onStartChat: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900 dark:to-emerald-800 mb-4">
        <Sparkles className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Start a conversation with your AI financial advisor to get personalized FIRE planning guidance
      </p>
      <Button onClick={onStartChat} className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700">
        <Sparkles className="h-4 w-4 mr-2" />
        Start New Chat
      </Button>
    </div>
  );
}
```

---

## Chat UI

### Floating Chat Button

```tsx
'use client';

import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatPanel } from './chat-panel';

export function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200"
            aria-label="Open AI Chat"
          >
            <Sparkles className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-6 right-6 z-50 w-full max-w-md h-[700px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800"
          >
            <ChatPanel onClose={() => setIsOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

### Chat Message Display

```tsx
'use client';

import { Sparkles, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      )}

      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-emerald-600 text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p className={`text-xs mt-1 ${isUser ? 'text-emerald-200' : 'text-gray-500'}`}>
          {message.timestamp.toLocaleTimeString()}
        </p>
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-700">
          <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
        </div>
      )}
    </motion.div>
  );
}

export function ChatMessages({ messages }: { messages: Message[] }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
    </div>
  );
}
```

---

**💡 Tip:** All these examples follow the FireCFO design system standards. Copy, paste, and customize as needed!

**📖 See Also:**
- `FireCFO Design System Reference.md` - Complete design system documentation
- `Design System Quick Reference.md` - Quick cheat sheet for common patterns
- `design-tokens.json` - Design tokens for Figma/tools integration
