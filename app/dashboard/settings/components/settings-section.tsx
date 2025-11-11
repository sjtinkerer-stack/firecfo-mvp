'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsSectionProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  onEdit: () => void;
  colorTheme?: 'blue' | 'orange' | 'emerald' | 'violet';
}

const colorThemes = {
  blue: {
    border: 'border-blue-200 dark:border-blue-800',
    bg: 'bg-white dark:bg-gray-900',
    iconBg: 'bg-blue-100 dark:bg-blue-950',
    iconColor: 'text-blue-600 dark:text-blue-400',
    buttonHover: 'hover:bg-blue-50 dark:hover:bg-blue-950/50',
  },
  orange: {
    border: 'border-orange-200 dark:border-orange-800',
    bg: 'bg-white dark:bg-gray-900',
    iconBg: 'bg-orange-100 dark:bg-orange-950',
    iconColor: 'text-orange-600 dark:text-orange-400',
    buttonHover: 'hover:bg-orange-50 dark:hover:bg-orange-950/50',
  },
  emerald: {
    border: 'border-emerald-200 dark:border-emerald-800',
    bg: 'bg-white dark:bg-gray-900',
    iconBg: 'bg-emerald-100 dark:bg-emerald-950',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    buttonHover: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/50',
  },
  violet: {
    border: 'border-violet-200 dark:border-violet-800',
    bg: 'bg-white dark:bg-gray-900',
    iconBg: 'bg-violet-100 dark:bg-violet-950',
    iconColor: 'text-violet-600 dark:text-violet-400',
    buttonHover: 'hover:bg-violet-50 dark:hover:bg-violet-950/50',
  },
};

export function SettingsSection({
  title,
  icon,
  children,
  onEdit,
  colorTheme = 'blue',
}: SettingsSectionProps) {
  const theme = colorThemes[colorTheme];

  return (
    <div
      className={cn(
        'rounded-xl border-2 p-6 transition-all duration-300',
        theme.border,
        theme.bg
      )}
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', theme.iconBg)}>
            <div className={theme.iconColor}>{icon}</div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className={cn('gap-2', theme.buttonHover)}
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </div>

      {/* Content */}
      <div>{children}</div>
    </div>
  );
}
