'use client'

import { useState, useEffect, ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'
import { PillSelector } from './pill-selector'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface PillOption {
  value: string
  label: string
}

interface AssetCategorySectionProps {
  title: string
  icon: LucideIcon
  tooltip: string
  options: PillOption[]
  value: number
  onChange: (value: number) => void
  className?: string
}

export function AssetCategorySection({
  title,
  icon: Icon,
  tooltip,
  options,
  value,
  onChange,
  className,
}: AssetCategorySectionProps) {
  const [isCustom, setIsCustom] = useState(false)

  // Initialize custom state based on saved value
  useEffect(() => {
    const validOptions = options
      .filter((opt) => opt.value !== 'custom')
      .map((opt) => opt.value)

    if (value > 0 && !validOptions.includes(value.toString())) {
      setIsCustom(true)
    }
  }, [])

  const handleSelect = (selectedValue: string) => {
    if (selectedValue === 'custom') {
      setIsCustom(true)
    } else {
      setIsCustom(false)
      onChange(parseInt(selectedValue))
    }
  }

  const getCurrentValue = () => {
    if (isCustom) return 'custom'
    const validOptions = options
      .filter((opt) => opt.value !== 'custom')
      .map((opt) => opt.value)
    return validOptions.includes(value.toString()) ? value.toString() : (value === 0 ? '0' : 'custom')
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Category Header with Divider */}
      <div className="flex items-center gap-3 pt-6 pb-2">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-gray-300 dark:from-gray-700 to-transparent" />
      </div>

      {/* Tooltip */}
      <p className="text-sm text-gray-600 dark:text-gray-400 -mt-1">{tooltip}</p>

      {/* Pills */}
      <PillSelector
        options={options}
        value={getCurrentValue()}
        onChange={handleSelect}
        columns={3}
        size="md"
      />

      {/* Custom Input */}
      {isCustom && (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
            ₹
          </span>
          <Input
            type="number"
            placeholder="Enter amount"
            className="h-12 pl-8 text-lg"
            value={value || ''}
            onChange={(e) => {
              const val = e.target.value === '' ? 0 : parseInt(e.target.value)
              onChange(val)
            }}
          />
        </div>
      )}
    </div>
  )
}
